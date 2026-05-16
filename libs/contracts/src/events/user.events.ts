import { BaseEvent } from './base.event';

export const USER_ROUTINGKEYS = {
  PROFILE_UPDATED: 'user.profile.updated',
  AVATAR_CHANGED: 'user.avatar.changed',
  USER_DEACTIVATED: 'user.deactivated',
  USER_DELETED: 'user.deleted',
} as const;

/** Represents the  user profile updated event component. */
export class UserProfileUpdatedEvent extends BaseEvent {
  get routingKey() {
    return USER_ROUTINGKEYS.PROFILE_UPDATED;
  }

  constructor(
    public readonly payload: {
      userId: string;
      changes: Partial<{
        firstName: string;
        lastName: string;
        phone: string;
        bio: string;
        majorId: string;
        courseId: string;
        semester: number;
        careerId: string;
        skillIds: string[];
      }>;
      updatedAt: Date;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  user deactivated event component. */
export class UserDeactivatedEvent extends BaseEvent {
  get routingKey() {
    return USER_ROUTINGKEYS.USER_DEACTIVATED;
  }

  constructor(
    public readonly payload: {
      userId: string;
      reason: string;
      deactivatedAt: Date;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

export const USER_RPC = {
  GET_USERS_PROFILES: 'user.rpc.get_profiles',
} as const;

export class GetUsersProfilesEvent extends BaseEvent {
  get routingKey() {
    return USER_RPC.GET_USERS_PROFILES;
  }

  constructor(
    public readonly payload: {
      userIds: string[];
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}
