import { DomainException } from '../exceptions/domain.exception';

export const CONTENT_ACCESS_RESOURCE_TYPES = ['RESOURCE', 'COLLECTION', 'TUTORIAL'] as const;

export type ContentAccessResourceType = (typeof CONTENT_ACCESS_RESOURCE_TYPES)[number];

/** Value object for the resource type stored in content access records. */
export class ContentAccessResourceTypeValue {
  private constructor(public readonly value: ContentAccessResourceType) {}

  static create(value: string): ContentAccessResourceTypeValue {
    if (!CONTENT_ACCESS_RESOURCE_TYPES.includes(value as ContentAccessResourceType)) {
      throw new DomainException(`Invalid content access resource type: ${value}`, 'INVALID_TYPE');
    }

    return new ContentAccessResourceTypeValue(value as ContentAccessResourceType);
  }
}
