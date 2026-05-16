import {
  authUserIds,
  collectionIds,
  randInt,
  RES_COLLECTION_COUNT,
  RESOURCE_COUNT,
  resourceIds,
  TUT_COLLECTION_COUNT,
  TUTORIAL_COUNT,
  tutorialIds,
  USER_COUNT,
} from './ids';

/**
 * Generate UserResourceAccess records (content-access-service, Postgres).
 *
 * From grant-access.handler:
 *   - userId: auth user UUID
 *   - resourceId: ObjectId hex string (resource, tutorial, or collection)
 *   - resourceType: 'RESOURCE' | 'COLLECTION' | 'TUTORIAL'
 *   - purchaseId: UUID from billing transaction (optional)
 *   - Unique compound: (userId, resourceId)
 *
 * The handler grants access per item type:
 *   RESOURCE → one access record per resource
 *   TUTORIAL → one access record per tutorial
 *   RESOURCE_COLLECTION → one record for collection + one per child resource
 *   TUTORIAL_COLLECTION → one record for collection + one per child tutorial
 */
export function genUserResourceAccess() {
  const accesses: any[] = [];
  const seen = new Set<string>();

  function addAccess(
    userId: string,
    resourceId: string,
    resourceType: 'RESOURCE' | 'COLLECTION' | 'TUTORIAL',
    purchaseId: string,
  ) {
    const key = `${userId}-${resourceId}`;
    if (seen.has(key)) return;
    seen.add(key);

    accesses.push({
      id: crypto.randomUUID(),
      user_id: userId,
      resource_id: resourceId,
      resource_type: resourceType,
      purchase_id: purchaseId,
      granted_at: new Date(Date.now() - randInt(0, 60) * 86400000),
      deleted_at: null,
    });
  }

  // Each user gets access to 3-10 resources + 1-3 tutorials
  for (let userIdx = 0; userIdx < USER_COUNT; userIdx++) {
    const userId = authUserIds[userIdx];

    // Resource access
    const numResources = randInt(3, 10);
    for (let j = 0; j < numResources; j++) {
      const resIdx = randInt(0, RESOURCE_COUNT - 1);
      const purchaseId = crypto.randomUUID();
      addAccess(userId, resourceIds[resIdx].toHexString(), 'RESOURCE', purchaseId);
    }

    // Tutorial access
    const numTutorials = randInt(1, 3);
    for (let j = 0; j < numTutorials; j++) {
      const tutIdx = randInt(0, TUTORIAL_COUNT - 1);
      const purchaseId = crypto.randomUUID();
      addAccess(userId, tutorialIds[tutIdx].toHexString(), 'TUTORIAL', purchaseId);
    }

    // Some users also have collection access (20% chance)
    if (Math.random() < 0.2) {
      const colIdx = randInt(0, RES_COLLECTION_COUNT + TUT_COLLECTION_COUNT - 1);
      const purchaseId = crypto.randomUUID();
      addAccess(userId, collectionIds[colIdx].toHexString(), 'COLLECTION', purchaseId);
    }
  }

  return accesses;
}
