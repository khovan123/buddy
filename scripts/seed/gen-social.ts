import { authUserIds, randInt, USER_COUNT } from './ids';

/**
 * Generate follow relationships between users.
 *
 * Constraints from follow.schema.ts:
 *   - followerId !== followingId
 *   - Unique compound index: (followerId, followingId)
 *   - followerId and followingId must be valid auth user IDs (UUID)
 */
export function genFollows(count = 200) {
  const follows: any[] = [];
  const seen = new Set<string>();

  while (follows.length < count) {
    const followerIdx = randInt(0, USER_COUNT - 1);
    const followingIdx = randInt(0, USER_COUNT - 1);

    // Constraint: can't follow yourself
    if (followerIdx === followingIdx) continue;

    const key = `${followerIdx}-${followingIdx}`;
    // Constraint: unique pair
    if (seen.has(key)) continue;
    seen.add(key);

    follows.push({
      followerId: authUserIds[followerIdx],
      followingId: authUserIds[followingIdx],
      createdAt: new Date(Date.now() - randInt(0, 60) * 86400000),
    });
  }

  return follows;
}

/**
 * Generate user ratings (creator reputation).
 *
 * Constraints from user-rating.schema.ts:
 *   - raterId !== targetId
 *   - Unique compound index: (raterId, targetId)
 *   - score: 1-5
 *   - comment: optional, max 500 chars
 */
const RATING_COMMENTS = [
  'Great content creator!',
  'Very helpful materials, highly recommend.',
  'Good quality resources.',
  'Average content, could be better.',
  'Excellent tutorials, learned a lot!',
  'Clear explanations and well-structured.',
  'The resources were outdated.',
  'Top-notch quality, will buy again.',
  'Decent materials for the price.',
  'Outstanding work, keep it up!',
];

export function genUserRatings(count = 150) {
  const ratings: any[] = [];
  const seen = new Set<string>();

  while (ratings.length < count) {
    const raterIdx = randInt(0, USER_COUNT - 1);
    // Rate creators (first 10 users are CREATOR_PRO)
    const targetIdx = randInt(0, 9);

    // Constraint: can't rate yourself
    if (raterIdx === targetIdx) continue;

    const key = `${raterIdx}-${targetIdx}`;
    // Constraint: unique pair
    if (seen.has(key)) continue;
    seen.add(key);

    const score = randInt(1, 5);

    ratings.push({
      raterId: authUserIds[raterIdx],
      targetId: authUserIds[targetIdx],
      score,
      comment: score >= 3 ? RATING_COMMENTS[randInt(0, RATING_COMMENTS.length - 1)] : undefined,
      createdAt: new Date(Date.now() - randInt(0, 60) * 86400000),
      updatedAt: new Date(),
    });
  }

  return ratings;
}
