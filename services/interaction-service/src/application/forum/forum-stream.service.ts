import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval, map, merge } from 'rxjs';

import type { ForumMessageView, ForumTopicView } from './forum.types';

type ForumEvent =
  | { type: 'forum.topic'; data: ForumTopicView }
  | { type: 'forum.message'; data: ForumMessageView };

@Injectable()
export class ForumStreamService {
  private readonly streams = new Set<Subject<MessageEvent>>();

  subscribe(): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      const subject = new Subject<MessageEvent>();
      this.streams.add(subject);

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
        this.streams.delete(subject);
      };
    });
  }

  publish(event: ForumEvent): void {
    if (this.streams.size === 0) {
      return;
    }

    for (const stream of this.streams) {
      stream.next(event);
    }
  }
}
