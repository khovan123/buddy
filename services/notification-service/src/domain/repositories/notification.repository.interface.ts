import { Notification } from '../entities/notification.entity';

/** Interface representing data constraints for  i notification repository. */
export interface INotificationRepository {
  save(notification: Notification): Promise<Notification>;
  update(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, limit?: number): Promise<Notification[]>;
  findPending(limit?: number): Promise<Notification[]>;
}
