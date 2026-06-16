/// <reference types="jest" />

import { Types } from 'mongoose';

import {
  FitEvidenceSourceType,
  FitStatus,
  LearningFit,
} from '../../src/domain/entities/learning-fit';
import { CollectionMongoRepository } from '../../src/infrastructure/persistence/mongo/repositories/collection.mongo.repository';
import { ResourceMongoRepository } from '../../src/infrastructure/persistence/mongo/repositories/resource.mongo.repository';
import { TutorialMongoRepository } from '../../src/infrastructure/persistence/mongo/repositories/tutorial.mongo.repository';
import {
  CollectionStatus,
  CollectionType,
} from '../../src/infrastructure/persistence/mongo/schemas/collection.schema';
import { ResourceStatus } from '../../src/infrastructure/persistence/mongo/schemas/resource.schema';
import { TutorialStatus } from '../../src/infrastructure/persistence/mongo/schemas/tutorial.schema';

type QueryMapper = {
  toQueryItem(row: Record<string, unknown>): { learningFit?: LearningFit | null };
};

const id = () => new Types.ObjectId();
const now = new Date('2026-06-16T10:00:00.000Z');

const learningFit: LearningFit = {
  bestFor: ['Students preparing for a calculus midterm'],
  notFor: ['Students looking for complete exam answers'],
  startHere: [{ title: 'Read the recap', order: 1 }],
  coveredTopics: ['Derivatives'],
  notCoveredTopics: [],
  learningOutcomes: [],
  estimatedStudyTimeMinutes: 45,
  difficulty: null,
  fitStatus: FitStatus.VERIFIED,
  fitEvidence: [
    {
      claim: 'Draft generated from extracted content metadata',
      sourceType: FitEvidenceSourceType.CONTENT_EXTRACTION,
      sourceRef: 'resource:calculus-review',
      confidence: 0.82,
    },
  ],
  fitGeneratedAt: now,
  fitVerifiedAt: now,
};

describe('LearningFit repository mapping', () => {
  it('keeps resource learningFit when mapping Mongo rows to query items', () => {
    const repo = new ResourceMongoRepository({} as never) as unknown as QueryMapper;

    const item = repo.toQueryItem({
      _id: id(),
      userId: 'creator-1',
      title: 'Calculus Review',
      slug: 'calculus-review',
      summary: 'Review derivatives',
      hightlights: ['Worked examples'],
      majorId: id(),
      courseId: id(),
      price: 10000,
      status: ResourceStatus.AVAILABLE,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
      meta: [{ extension: 'pdf' }],
      learningFit,
    });

    expect(item.learningFit).toEqual(learningFit);
  });

  it('keeps tutorial learningFit and preserves null for legacy tutorials', () => {
    const repo = new TutorialMongoRepository({} as never) as unknown as QueryMapper;
    const base = {
      _id: id(),
      userId: 'creator-1',
      title: 'Derivatives Tutorial',
      slug: 'derivatives-tutorial',
      description: 'Video walkthrough',
      hightlights: ['Common mistakes'],
      majorId: id(),
      courseId: id(),
      price: 12000,
      status: TutorialStatus.AVAILABLE,
      isVerified: true,
      discountBundle: 0,
      createdAt: now,
      updatedAt: now,
      resourceIds: [],
      collectionIds: [],
      steps: [],
      media: {},
    };

    expect(repo.toQueryItem({ ...base, learningFit }).learningFit).toEqual(learningFit);
    expect(repo.toQueryItem({ ...base, learningFit: null }).learningFit).toBeNull();
  });

  it('keeps collection learningFit when mapping roadmap collections', () => {
    const repo = new CollectionMongoRepository({} as never) as unknown as QueryMapper;

    const item = repo.toQueryItem({
      _id: id(),
      userId: 'creator-1',
      title: 'Exam Prep Path',
      slug: 'exam-prep-path',
      description: 'Roadmap collection',
      hightlights: ['Checkpoint plan'],
      majorId: id(),
      courseId: id(),
      resourceIds: [],
      type: CollectionType.RESOURCE,
      discount: 10,
      status: CollectionStatus.AVAILABLE,
      createdAt: now,
      updatedAt: now,
      resources: [],
      tutorials: [],
      phases: [
        {
          phaseTitle: 'Foundation',
          learningGoal: 'Review the basics',
          items: [{ itemId: id(), itemType: 'RESOURCE' }],
        },
      ],
      learningFit,
    });

    expect(item.learningFit).toEqual(learningFit);
  });
});
