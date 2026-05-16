import { coursesByMajor } from './gen-academics';
import {
  authUserIds,
  collectionIds,
  majorIds,
  pick,
  randInt,
  RES_COLLECTION_COUNT,
  RESOURCE_COUNT,
  resourceIds,
  TUT_COLLECTION_COUNT,
  TUTORIAL_COUNT,
  tutorialIds,
} from './ids';

type Action = 'VIEW_PREVIEW' | 'LIKE' | 'UNLIKE' | 'COMMENT' | 'RATING' | 'DOWNLOAD' | 'PURCHASE';

const WEIGHTS: Record<Action, number> = {
  VIEW_PREVIEW: 1,
  LIKE: 5,
  UNLIKE: -5,
  COMMENT: 6,
  RATING: 6,
  DOWNLOAD: 8,
  PURCHASE: 10,
};

// Distribution: VIEW 40%, LIKE 15%, DOWNLOAD 15%, RATING 10%, COMMENT 10%, PURCHASE 8%, UNLIKE 2%
function pickAction(): Action {
  const r = Math.random() * 100;
  if (r < 40) return 'VIEW_PREVIEW';
  if (r < 55) return 'LIKE';
  if (r < 70) return 'DOWNLOAD';
  if (r < 80) return 'RATING';
  if (r < 90) return 'COMMENT';
  if (r < 98) return 'PURCHASE';
  return 'UNLIKE';
}

function pickItemType(): 'RESOURCE' | 'TUTORIAL' | 'RESOURCE_COLLECTION' | 'TUTORIAL_COLLECTION' {
  const r = Math.random() * 100;
  if (r < 50) return 'RESOURCE';
  if (r < 85) return 'TUTORIAL';
  if (r < 95) return 'RESOURCE_COLLECTION';
  return 'TUTORIAL_COLLECTION';
}

function pickItem(itemType: string) {
  switch (itemType) {
    case 'RESOURCE':
      return resourceIds[randInt(0, RESOURCE_COUNT - 1)];
    case 'TUTORIAL':
      return tutorialIds[randInt(0, TUTORIAL_COUNT - 1)];
    case 'RESOURCE_COLLECTION':
      return collectionIds[randInt(0, RES_COLLECTION_COUNT - 1)];
    case 'TUTORIAL_COLLECTION':
      return collectionIds[RES_COLLECTION_COUNT + randInt(0, TUT_COLLECTION_COUNT - 1)];
    default:
      return resourceIds[0];
  }
}

/** Generate ~2500 interactions with realistic distribution */
export function genInteractions(count = 2500) {
  return Array.from({ length: count }, (_, i) => {
    const userIdx = randInt(0, authUserIds.length - 1);
    const majorIdx = userIdx % 6;
    const courses = coursesByMajor(majorIdx);
    const course = pick(courses);
    const action = pickAction();
    const itemType = pickItemType();
    const itemId = pickItem(itemType);

    let weight = WEIGHTS[action as Action];
    const metadata: Record<string, any> = {
      majorId: majorIds[majorIdx].toHexString(),
      courseId: course._id.toHexString(),
      semester: course.semester,
    };

    if (action === 'RATING') {
      const stars = randInt(1, 5);
      metadata.ratingValue = stars;
      weight = (weight * stars) / 5;
    }
    if (action === 'COMMENT') {
      metadata.commentId = `comment_${i}`;
    }

    return {
      userId: authUserIds[userIdx],
      itemId: itemId.toHexString(),
      itemType,
      action,
      weight,
      metadata,
      createdAt: new Date(Date.now() - randInt(0, 90) * 86400000),
      updatedAt: new Date(),
    };
  });
}
