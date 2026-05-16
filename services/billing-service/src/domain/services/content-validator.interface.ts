export type PurchasableContentType =
  | 'RESOURCE'
  | 'TUTORIAL'
  | 'RESOURCE_COLLECTION'
  | 'TUTORIAL_COLLECTION'
  | 'TUTORIAL_BUNDLE'
  | 'TUTORIAL_BUNDLE_COLLECTION';

/** Interface representing data constraints for  i content validator. */
export interface IContentValidator {
  validateContentStatus(itemId: string, itemType: PurchasableContentType): Promise<boolean>;
}
