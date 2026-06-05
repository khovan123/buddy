import { Types } from 'mongoose';

export type NotificationType = 'email' | 'push' | 'sms' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type NotificationChannel =
  | 'welcome'
  | 'password_reset'
  | 'generic'
  | 'alert'
  | 'purchase'
  | 'content-moderation'
  | 'model-trained';

/** Interface representing data constraints for  notification props. */
export interface NotificationProps {
  _id?: Types.ObjectId;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string; // email address or device token
  subject?: string;
  templateId: string;
  templateData: Record<string, unknown>;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  readAt?: Date | null;
  errorMessage?: string;
  correlationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Represents the  notification component. */
export class Notification {
  private constructor(private props: NotificationProps) {}

  /**
   * Executes the create operation.
   *
   * @param params - The params parameter
   * @returns Result of type Notification
   */
  static create(params: {
    userId: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    templateId: string;
    templateData: Record<string, unknown>;
    correlationId?: string;
  }): Notification {
    const now = new Date();
    return new Notification({
      ...params,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Executes the reconstitute operation.
   *
   * @param props - The props parameter
   * @returns Result of type Notification
   */
  static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  /**
   * Executes the mark sent operation.
   *
   */
  markSent(): void {
    this.props.status = 'sent';
    this.props.sentAt = new Date();
    this.props.attempts += 1;
    this.props.lastAttemptAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the mark failed operation.
   *
   * @param errorMessage - The errorMessage parameter
   */
  markFailed(errorMessage: string): void {
    this.props.attempts += 1;
    this.props.lastAttemptAt = new Date();
    this.props.errorMessage = errorMessage;
    this.props.status = this.props.attempts >= this.props.maxAttempts ? 'failed' : 'pending';
    this.props.updatedAt = new Date();
  }

  markRead(): void {
    this.props.readAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the can retry operation.
   *
   * @returns Result of type boolean
   */
  canRetry(): boolean {
    return this.props.attempts < this.props.maxAttempts && this.props.status !== 'sent';
  }

  get _id(): Types.ObjectId | undefined {
    return this.props._id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get type(): NotificationType {
    return this.props.type;
  }
  get channel(): NotificationChannel {
    return this.props.channel;
  }
  get recipient(): string {
    return this.props.recipient;
  }
  get subject(): string | undefined {
    return this.props.subject;
  }
  get templateId(): string {
    return this.props.templateId;
  }
  get templateData(): Record<string, unknown> {
    return this.props.templateData;
  }
  get status(): NotificationStatus {
    return this.props.status;
  }
  get attempts(): number {
    return this.props.attempts;
  }
  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }
  get readAt(): Date | null | undefined {
    return this.props.readAt;
  }
  get correlationId(): string | undefined {
    return this.props.correlationId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
