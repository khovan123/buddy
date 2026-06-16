import {
  ContentAccessResourceTypeValue,
  type ContentAccessResourceType,
} from '../value-objects/content-access-resource-type.vo';

export interface ContentAccessProps {
  id?: string;
  userId: string;
  resourceId: string;
  resourceType: ContentAccessResourceTypeValue;
  purchaseId: string | null;
  grantedAt: Date;
  deletedAt?: Date | null;
}

/** Domain entity representing a user's granted access to a content item. */
export class ContentAccess {
  private constructor(private readonly props: ContentAccessProps) {}

  static reconstitute(props: {
    id?: string;
    userId: string;
    resourceId: string;
    resourceType: ContentAccessResourceType;
    purchaseId: string | null;
    grantedAt: Date;
    deletedAt?: Date | null;
  }): ContentAccess {
    return new ContentAccess({
      ...props,
      resourceType: ContentAccessResourceTypeValue.create(props.resourceType),
    });
  }

  get id(): string | undefined {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get resourceId(): string {
    return this.props.resourceId;
  }

  get resourceType(): ContentAccessResourceType {
    return this.props.resourceType.value;
  }

  get purchaseId(): string | null {
    return this.props.purchaseId;
  }

  get grantedAt(): Date {
    return this.props.grantedAt;
  }

  get deletedAt(): Date | null | undefined {
    return this.props.deletedAt;
  }
}
