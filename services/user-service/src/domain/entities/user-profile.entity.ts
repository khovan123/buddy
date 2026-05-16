import { UserProfileUpdatedDomainEvent } from '../events/user-profile-updated.domain-event';
import { DomainException } from '../exceptions/domain.exception';

/** Interface representing data constraints for  user profile. */
export interface UserProfile {
  nickname: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  majorId?: string;
  courseId?: string;
  semester?: number;
  careerId?: string;
  skillIds?: string[];
  career?: { id: string; name: string };
  skills?: { id: string; name: string }[];
}

/** Interface representing data constraints for  user props. */
export interface UserProps {
  id?: string;
  userId: string;
  email: string;
  profile: UserProfile;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Domain Entity/Aggregate representing  user profile. */
export class UserProfileAggregate {
  private readonly _events: UserProfileUpdatedDomainEvent[] = [];

  private constructor(private props: UserProps) {}

  /**
   * Executes the create operation.
   *
   * @param params - The params parameter
   * @returns Result of type UserProfileAggregate
   */
  static create(params: { userId: string; email: string; nickname: string }): UserProfileAggregate {
    const now = new Date();
    return new UserProfileAggregate({
      userId: params.userId,
      email: params.email,
      profile: { nickname: params.nickname },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Executes the reconstitute operation.
   *
   * @param props - The props parameter
   * @returns Result of type UserProfileAggregate
   */
  static reconstitute(props: UserProps): UserProfileAggregate {
    return new UserProfileAggregate(props);
  }

  /**
   * Executes the update profile operation.
   *
   * @param changes - The changes parameter
   */
  updateProfile(changes: Partial<Omit<UserProfile, 'avatarUrl'>>): void {
    if (!this.props.isActive) throw new DomainException('Cannot update inactive user profile');

    this.props.profile = { ...this.props.profile, ...changes };
    this.props.updatedAt = new Date();

    this._events.push(
      new UserProfileUpdatedDomainEvent({
        userId: this.userId,
        changes,
        updatedAt: this.props.updatedAt,
      }),
    );
  }

  /**
   * Executes the set avatar operation.
   *
   * @param avatarUrl - The avatarUrl parameter
   */
  setAvatar(avatarUrl: string): void {
    if (!avatarUrl.startsWith('http')) throw new DomainException('Invalid avatar URL');
    this.props.profile.avatarUrl = avatarUrl;
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the deactivate operation.
   *
   */
  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the pull events operation.
   *
   * @returns Result of type UserProfileUpdatedDomainEvent[]
   */
  pullEvents(): UserProfileUpdatedDomainEvent[] {
    const evts = [...this._events];
    this._events.length = 0;
    return evts;
  }

  get id(): string | undefined {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get email(): string {
    return this.props.email;
  }
  get profile(): UserProfile {
    return { ...this.props.profile };
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get nickname(): string {
    return this.props.profile.nickname;
  }
}
