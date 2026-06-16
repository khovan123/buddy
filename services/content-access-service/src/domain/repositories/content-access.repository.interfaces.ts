import type { ContentAccess } from '../entities/content-access.entity';
import type { ContentAccessResourceType } from '../value-objects/content-access-resource-type.vo';

export type GrantAccessItem = {
  itemId: string;
  itemType: string;
  resourceIds?: string[];
  tutorialId?: string;
  tutorialIds?: string[];
};

export type GrantAccessResult = {
  grantedCount: number;
};

export interface ContentAccessGrantInput {
  purchaseId: string;
  userId: string;
  purchasedItems: GrantAccessItem[];
}

/** Repository boundary for user content access persistence. */
export interface IContentAccessRepository {
  hasAccess(userId: string, resourceId: string): Promise<boolean>;
  listByUserId(userId: string): Promise<ContentAccess[]>;
  grantForPurchase(input: ContentAccessGrantInput): Promise<GrantAccessResult>;
  revokeByPurchase(userId: string, purchaseId: string): Promise<number>;
}

export type { ContentAccess, ContentAccessResourceType };
