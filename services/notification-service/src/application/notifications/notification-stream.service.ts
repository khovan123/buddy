import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval, map, merge } from 'rxjs';
import { Notification } from '../../domain/entities/notification.entity';

export interface NotificationStreamPayload {
  _id: string;
  type: string;
  channel: string;
  subject?: string;
  templateId: string;
  templateData: Record<string, unknown>;
  status: string;
  attempts: number;
  createdAt: string;
}

function toStreamPayload(notification: Notification): NotificationStreamPayload {
  return {
    _id: notification._id?.toString() ?? '',
    type: notification.type,
    channel: notification.channel,
    subject: notification.subject,
    templateId: notification.templateId,
    templateData: notification.templateData,
    status: notification.status,
    attempts: notification.attempts,
    createdAt: notification.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationStreamService {
  private readonly streams = new Map<string, Set<Subject<MessageEvent>>>();

  subscribe(userId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      const subject = new Subject<MessageEvent>();
      const userStreams = this.streams.get(userId) ?? new Set<Subject<MessageEvent>>();
      userStreams.add(subject);
      this.streams.set(userId, userStreams);

      const subscription = merge(
        subject.asObservable(),
        interval(30_000).pipe(
          map(() => ({
            type: 'heartbeat',
            data: { timestamp: new Date().toISOString() },
          })),
        ),
      ).subscribe(observer);

      return () => {
        subscription.unsubscribe();
        subject.complete();
        userStreams.delete(subject);
        if (userStreams.size === 0) {
          this.streams.delete(userId);
        }
      };
    });
  }

  publish(notification: Notification): void {
    const userStreams = this.streams.get(notification.userId);
    if (!userStreams || userStreams.size === 0) {
      return;
    }

    const event: MessageEvent = {
      type: 'notification',
      data: toStreamPayload(notification),
    };

    for (const stream of userStreams) {
      stream.next(event);
    }
  }
}
