import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../../../../domain/entities/notification.entity';
import { INotificationRepository } from '../../../../domain/repositories/notification.repository.interface';
import { NotificationDocument } from '../schemas/notification.schema';

/** Repository interface/implementation for  notification mongo data access. */
@Injectable()
export class NotificationMongoRepository implements INotificationRepository {
  constructor(
    @InjectModel('Notification')
    private readonly model: Model<NotificationDocument>,
  ) {}

  /**
   * Executes the save operation.
   *
   * @param notification - The notification parameter
   * @returns Result of type Promise<Notification>
   */
  async save(notification: Notification): Promise<Notification> {
    return this.toDomain(await this.model.create(this.toDocument(notification)));
  }

  /**
   * Executes the update operation.
   *
   * @param notification - The notification parameter
   */
  async update(notification: Notification): Promise<void> {
    await this.model.findByIdAndUpdate(notification._id, this.toDocument(notification)).exec();
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<Notification | null>
   */
  async findById(id: string): Promise<Notification | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Executes the find by user id operation.
   *
   * @param userId - The userId parameter
   * @param limit - The limit parameter
   * @returns Result of type Promise<Notification[]>
   */
  async findByUserId(userId: string, limit = 50): Promise<Notification[]> {
    const docs = await this.model.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
    return docs.map((d) => this.toDomain(d));
  }

  async markAllReadByUserId(userId: string, readAt = new Date()): Promise<number> {
    const result = await this.model
      .updateMany({ userId, readAt: null }, { $set: { readAt } })
      .exec();
    return result.modifiedCount;
  }

  /**
   * Executes the find pending operation.
   *
   * @param limit - The limit parameter
   * @returns Result of type Promise<Notification[]>
   */
  async findPending(limit = 100): Promise<Notification[]> {
    const docs = await this.model
      .find({ status: 'pending', attempts: { $lt: 3 } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
    return docs.map((d) => this.toDomain(d));
  }

  /**
   * Executes the to domain operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type Notification
   */
  private toDomain(doc: NotificationDocument): Notification {
    return Notification.reconstitute({
      _id: doc._id,
      userId: doc.userId,
      type: doc.type as NotificationType,
      channel: doc.channel as NotificationChannel,
      recipient: doc.recipient,
      subject: doc.subject,
      templateId: doc.templateId,
      templateData: doc.templateData,
      status: doc.status as NotificationStatus,
      attempts: doc.attempts,
      maxAttempts: doc.maxAttempts,
      lastAttemptAt: doc.lastAttemptAt,
      sentAt: doc.sentAt,
      readAt: doc.readAt,
      errorMessage: doc.errorMessage,
      correlationId: doc.correlationId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Executes the to document operation.
   *
   * @param n - The n parameter
   * @returns Result of type Record<string, unknown>
   */
  private toDocument(n: Notification): Record<string, unknown> {
    return {
      userId: n.userId,
      type: n.type,
      channel: n.channel,
      recipient: n.recipient,
      subject: n.subject,
      templateId: n.templateId,
      templateData: n.templateData,
      status: n.status,
      attempts: n.attempts,
      readAt: n.readAt,
      errorMessage: n.errorMessage,
      correlationId: n.correlationId,
    };
  }
}
