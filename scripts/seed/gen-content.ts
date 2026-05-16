import { getSeedThumbnailUrl, getSeedTrailerUrl } from './cloudinary-uploader';
import { coursesByMajor } from './gen-academics';
import { DEFAULT_BUCKET, SUPABASE_URL } from './gen-media';
import { getTutorialS3Key } from './s3-uploader';
import {
  authUserIds,
  collectionIds,
  majorIds,
  mediaFileIds,
  pick,
  pickN,
  randInt,
  RES_COLLECTION_COUNT,
  RESOURCE_COUNT,
  resourceIds,
  slugify,
  TUT_COLLECTION_COUNT,
  TUTORIAL_COUNT,
  tutorialIds,
} from './ids';

// ── Realistic title pools ──────────────────────────────────────────────────

const RES_ADJECTIVES = [
  'Complete',
  'Essential',
  'Advanced',
  'Practical',
  'Modern',
  'Comprehensive',
  'Beginner',
  'Pro',
  'Quick',
  'Deep',
];
const RES_TOPICS = [
  'Java Cheat Sheet',
  'Python Notes',
  'React Hooks Guide',
  'SQL Queries',
  'Git Commands',
  'Docker Setup',
  'Linux Commands',
  'REST API Design',
  'TypeScript Types',
  'MongoDB Guide',
  'Algorithm Patterns',
  'System Design Notes',
  'CSS Flexbox',
  'Node.js Patterns',
  'Redux Toolkit',
  'GraphQL Schema',
  'Kubernetes Intro',
  'CI/CD Pipeline',
  'AWS Services',
  'Redis Caching',
];

const TUT_TOPICS = [
  'Build a REST API',
  'React Dashboard',
  'Machine Learning Intro',
  'Docker Containers',
  'Next.js Full-Stack App',
  'Database Optimization',
  'Auth with JWT',
  'WebSocket Chat',
  'Microservices Pattern',
  'Deploy to AWS',
  'Data Pipeline',
  'Testing Strategies',
  'Flutter Mobile App',
  'Python Automation',
  'Kubernetes Cluster',
];

const EXTENSIONS = ['pdf', 'docx', 'pptx', 'xlsx', 'zip'];

function resTitle(i: number) {
  return `${RES_ADJECTIVES[i % RES_ADJECTIVES.length]} ${RES_TOPICS[i % RES_TOPICS.length]}`;
}

function tutTitle(i: number) {
  return `${RES_ADJECTIVES[i % RES_ADJECTIVES.length]} ${TUT_TOPICS[i % TUT_TOPICS.length]}`;
}

// ── Resources ──────────────────────────────────────────────────────────────
//
// Key constraint from create-resource.handler:
//   - majorId must reference existing Major
//   - courseId must belong to that majorId (validateCourseExists)
//   - collectionId must be type RESOURCE (if set)
//
// We enforce course∈major by picking a course from coursesByMajor(majorIdx).

export function genResources() {
  return Array.from({ length: RESOURCE_COUNT }, (_, i) => {
    const userIdx = i % authUserIds.length;
    const majorIdx = userIdx % 6;
    const courses = coursesByMajor(majorIdx);
    const course = pick(courses);
    const title = resTitle(i);
    const ext = EXTENSIONS[i % EXTENSIONS.length];

    return {
      _id: resourceIds[i],
      userId: authUserIds[userIdx],
      title,
      slug: slugify(title, i),
      summary: `A ${title.toLowerCase()} covering key concepts and practice problems for semester ${course.semester}.`,
      hightlights: [
        `Covers ${course.name} topics`,
        `Includes practice exercises`,
        `${randInt(10, 50)} pages of content`,
      ],
      majorId: majorIds[majorIdx],
      courseId: course._id,
      price: randInt(0, 50) * 1000,
      status: 'AVAILABLE',
      isVerified: i % 3 === 0,
      tutorialId: null, // Set later by genTutorials
      collectionId: null, // Set later by genCollections
      meta: [
        {
          fileId: mediaFileIds[i], // Synced with upload-service
          downloadUrl: '',
          fileSize: randInt(100000, 5000000),
          extension: ext,
        },
      ],
      thumbnailUrl: getSeedThumbnailUrl(),
      primaryS3Key: `docs/${mediaFileIds[i]}.${ext}`,
      deletedAt: null,
      createdAt: new Date(Date.now() - randInt(0, 90) * 86400000),
      updatedAt: new Date(),
    };
  });
}

// ── Tutorials ──────────────────────────────────────────────────────────────
//
// Key constraints from create-tutorial.handler:
//   - majorId/courseId validated same as resource
//   - resourceIds: resources that belong to this tutorial (MUST share majorId+courseId)
//   - collectionId: mutual exclusion with resourceIds (but both CAN be empty)
//   - steps: each step.resources[].resourceId must be valid and in same major/course
//   - finalResourceIds is derived from steps if not explicitly provided
//   - resources already used by another tutorial are rejected

export function genTutorials() {
  // Build a per-major index of resource indices for fast lookup.
  // We group by majorIdx only (not course) because pick() is random
  // and we can't reproduce the exact course each resource got.
  const resourceByMajor = new Map<string, number[]>();
  for (let ri = 0; ri < RESOURCE_COUNT; ri++) {
    const majorIdx = (ri % authUserIds.length) % 6;
    const key = `${majorIdx}`;
    if (!resourceByMajor.has(key)) resourceByMajor.set(key, []);
    resourceByMajor.get(key)!.push(ri);
  }

  // Track which resources are already assigned to a tutorial
  const assignedResources = new Set<number>();

  return Array.from({ length: TUTORIAL_COUNT }, (_, i) => {
    const userIdx = i % authUserIds.length;
    const majorIdx = userIdx % 6;
    const courses = coursesByMajor(majorIdx);
    const course = pick(courses);
    const title = tutTitle(i);
    const mediaIdx = RESOURCE_COUNT + i; // Offset past resource media
    const fileId = mediaFileIds[mediaIdx];
    const s3Key = getTutorialS3Key(i); // Shared S3 key from one-time upload

    // Link 2-4 resources from the SAME major (constraint: validateTargetIntegrity)
    const availableInMajor = (resourceByMajor.get(`${majorIdx}`) || []).filter(
      (ri) => !assignedResources.has(ri),
    );

    const numResources = Math.min(availableInMajor.length, randInt(2, 4));
    const pickedResourceIndices = availableInMajor.slice(0, numResources);
    pickedResourceIndices.forEach((ri) => assignedResources.add(ri));

    const linkedResourceIds = pickedResourceIndices.map((ri) => resourceIds[ri]);

    // Generate tutorial steps using the linked resources
    const steps =
      linkedResourceIds.length > 0
        ? [
            {
              title: `Step 1: Introduction to ${course.name}`,
              resources: linkedResourceIds
                .slice(0, Math.ceil(linkedResourceIds.length / 2))
                .map((rid) => ({
                  resourceId: rid,
                  instructionNote: 'Read through this material before watching the video',
                })),
            },
            {
              title: `Step 2: Practice & Apply`,
              resources: linkedResourceIds
                .slice(Math.ceil(linkedResourceIds.length / 2))
                .map((rid) => ({
                  resourceId: rid,
                  instructionNote: 'Complete the exercises in this resource',
                })),
            },
          ]
        : [];

    return {
      _id: tutorialIds[i],
      userId: authUserIds[userIdx],
      title,
      slug: slugify(title, i),
      description: `Tutorial: ${title}. Learn step-by-step with practical examples for ${course.name}.`,
      hightlights: [
        `Hands-on ${course.name} tutorial`,
        `Video walkthrough included`,
        `${randInt(15, 120)} minutes of content`,
      ],
      majorId: majorIds[majorIdx],
      courseId: course._id,
      media: {
        fileId,
        videoUrl: `${SUPABASE_URL}/storage/v1/object/public/${DEFAULT_BUCKET}/${s3Key}`,
        streamingUrl: `${SUPABASE_URL}/storage/v1/object/public/${DEFAULT_BUCKET}/videos/${fileId}/hls/master.m3u8`,
        trailerUrl: getSeedTrailerUrl(fileId),
        duration: randInt(600, 7200),
        fileSize: randInt(50000000, 500000000),
        extension: 'mp4',
      },
      price: randInt(0, 100) * 1000,
      isVerified: i % 4 === 0,
      status: 'AVAILABLE',
      discountBundle: 15,
      thumbnailUrl: getSeedThumbnailUrl(),
      collectionId: null, // Set later by genCollections
      resourceIds: linkedResourceIds,
      collectionIds: [], // Set later by genCollections
      steps,
      deletedAt: null,
      createdAt: new Date(Date.now() - randInt(0, 90) * 86400000),
      updatedAt: new Date(),
    };
  });
}

// ── Collections ────────────────────────────────────────────────────────────
//
// Key constraints from create-collection.handler:
//   - Must have at least 1 phase
//   - RESOURCE type: phases contain RESOURCE items only, no tutorialIds
//   - TUTORIAL type: phases contain TUTORIAL items only, no resourceIds
//     - Tutorials must not already belong to another collection
//     - Discount >= 20 for TUTORIAL type
//   - All items must share majorId & courseId (validateTargetIntegrity)
//   - After save, tutorials are backlinked via assignCollectionToTutorials
//
// Post-processing: We return the collections AND the backlink patches to apply
// to tutorials and resources.

export function genCollections() {
  const collections: any[] = [];

  // Track which tutorials are already assigned to a collection (constraint)
  const assignedTutorials = new Set<number>();

  // 50 Resource Collections (≥3 resources each, SAME major)
  for (let i = 0; i < RES_COLLECTION_COUNT; i++) {
    const majorIdx = i % 6;
    const courses = coursesByMajor(majorIdx);
    const course = pick(courses);
    // Filter resources that belong to the same major
    const resInMajor = Array.from({ length: RESOURCE_COUNT }, (_, ri) => ri).filter(
      (ri) => (ri % authUserIds.length) % 6 === majorIdx,
    );
    const pickedRes = pickN(resInMajor, randInt(3, 6));
    const title = `${['Semester', 'Essential', 'Top', 'Must-Have', 'Complete'][i % 5]} ${courses[i % courses.length]?.name || 'Study'} Resources Pack ${i + 1}`;

    collections.push({
      _id: collectionIds[i],
      userId: authUserIds[i % authUserIds.length],
      title,
      slug: slugify(title, i),
      description: `Curated resource collection for ${course.name}`,
      hightlights: ['Curated materials', 'Save time studying', 'Expert-picked content'],
      majorId: majorIds[majorIdx],
      courseId: course._id,
      resourceIds: pickedRes.map((ri) => resourceIds[ri]),
      type: 'RESOURCE',
      discount: 10,
      status: 'AVAILABLE',
      thumbnailUrl: getSeedThumbnailUrl(),
      deletedAt: null,
      phases: [
        {
          phaseTitle: 'Getting Started',
          learningGoal: 'Master the basics',
          items: pickedRes
            .slice(0, 2)
            .map((ri) => ({ itemId: resourceIds[ri], itemType: 'RESOURCE' })),
        },
        {
          phaseTitle: 'Deep Dive',
          learningGoal: 'Advanced concepts',
          items: pickedRes
            .slice(2)
            .map((ri) => ({ itemId: resourceIds[ri], itemType: 'RESOURCE' })),
        },
      ],
      createdAt: new Date(Date.now() - randInt(0, 60) * 86400000),
      updatedAt: new Date(),
    });
  }

  // 30 Tutorial Collections (≥4 tutorials each, SAME major, no duplicates)
  for (let i = 0; i < TUT_COLLECTION_COUNT; i++) {
    const cIdx = RES_COLLECTION_COUNT + i;
    const majorIdx = i % 6;
    const courses = coursesByMajor(majorIdx);
    const course = pick(courses);
    const tutInMajor = Array.from({ length: TUTORIAL_COUNT }, (_, ti) => ti).filter(
      (ti) => (ti % authUserIds.length) % 6 === majorIdx && !assignedTutorials.has(ti),
    );
    const pickedTut = pickN(tutInMajor, randInt(4, 7));
    // Mark as assigned so no tutorial belongs to 2 collections
    pickedTut.forEach((ti) => assignedTutorials.add(ti));

    const title = `${['Complete', 'Mastery', 'Pro', 'Bootcamp', 'Quick'][i % 5]} ${courses[i % courses.length]?.name || 'Learning'} Tutorial Series ${i + 1}`;

    collections.push({
      _id: collectionIds[cIdx],
      userId: authUserIds[i % authUserIds.length],
      title,
      slug: slugify(title, cIdx),
      description: `Tutorial collection for mastering ${course.name}`,
      hightlights: ['Step-by-step learning', 'Video tutorials', 'Practice projects'],
      majorId: majorIds[majorIdx],
      courseId: course._id,
      resourceIds: [], // TUTORIAL type must not have resourceIds
      type: 'TUTORIAL',
      discount: 20, // Minimum 20% for TUTORIAL collections (schema pre-save hook)
      status: 'AVAILABLE',
      thumbnailUrl: getSeedThumbnailUrl(),
      deletedAt: null,
      phases: [
        {
          phaseTitle: 'Fundamentals',
          learningGoal: 'Core concepts',
          items: pickedTut
            .slice(0, 2)
            .map((ti) => ({ itemId: tutorialIds[ti], itemType: 'TUTORIAL' })),
        },
        {
          phaseTitle: 'Intermediate',
          learningGoal: 'Build real projects',
          items: pickedTut
            .slice(2)
            .map((ti) => ({ itemId: tutorialIds[ti], itemType: 'TUTORIAL' })),
        },
      ],
      // Store picked tutorial indices for backlink patching
      _pickedTutorialIndices: pickedTut,
      createdAt: new Date(Date.now() - randInt(0, 60) * 86400000),
      updatedAt: new Date(),
    });
  }

  return collections;
}

/**
 * Apply backlinks from collections to tutorials and resources.
 * Must be called AFTER genResources/genTutorials/genCollections.
 *
 * Simulates what create-collection.handler does:
 *   - TUTORIAL type → assignCollectionToTutorials (sets tutorial.collectionId)
 *   - RESOURCE type → sets resource.collectionId for each resource in the collection
 */
export function applyCollectionBacklinks(
  resources: any[],
  tutorials: any[],
  collections: any[],
): void {
  // Build lookup maps
  const resourceById = new Map(resources.map((r: any) => [r._id.toHexString(), r]));
  const tutorialById = new Map(tutorials.map((t: any) => [t._id.toHexString(), t]));

  for (const col of collections) {
    if (col.type === 'RESOURCE') {
      // Backlink: resource.collectionId = collection._id
      for (const rid of col.resourceIds) {
        const res = resourceById.get(rid.toHexString());
        if (res) res.collectionId = col._id;
      }
    } else if (col.type === 'TUTORIAL') {
      // Backlink: tutorial.collectionId = collection._id (handler: assignCollectionToTutorials)
      const pickedIndices = col._pickedTutorialIndices || [];
      for (const ti of pickedIndices) {
        const tut = tutorialById.get(tutorialIds[ti].toHexString());
        if (tut) {
          tut.collectionId = col._id;
          // Also add to tutorial.collectionIds array
          if (!tut.collectionIds) tut.collectionIds = [];
          tut.collectionIds.push(col._id);
        }
      }
      // Clean up internal field before inserting to DB
      delete col._pickedTutorialIndices;
    }
  }

  // Also backlink: resource.tutorialId for resources that appear in tutorial.resourceIds
  for (const tut of tutorials) {
    if (tut.resourceIds && tut.resourceIds.length > 0) {
      for (const rid of tut.resourceIds) {
        const res = resourceById.get(rid.toHexString());
        if (res && !res.tutorialId) {
          res.tutorialId = tut._id;
        }
      }
    }
  }
}
