import { Injectable, MessageEvent } from '@nestjs/common';
import { InteractionStatsPayload } from '@libs/contracts';
import { Observable, Subject, interval, map, merge } from 'rxjs';

@Injectable()
export class InteractionStreamService {
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

  publish(stats: InteractionStatsPayload): void {
    if (this.streams.size === 0) {
      return;
    }

    const event: MessageEvent = {
      type: 'interaction.stats',
      data: stats,
    };

    for (const stream of this.streams) {
      stream.next(event);
    }
  }
}
