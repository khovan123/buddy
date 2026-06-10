import { AmqpConnection, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { EXCHANGES } from '../config/rabbitmq.config';

export const RABBITMQ_CONNECTION = Symbol('RABBITMQ_CONNECTION');

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      useFactory: () => {
        const url = process.env.RABBITMQ_URL;
        if (!url) {
          throw new Error('Need RABBITMQ_URL config for MessagingModule');
        }

        return {
          exchanges: [
            { name: EXCHANGES.AUTH, type: 'topic' },
            { name: EXCHANGES.USER, type: 'topic' },
            { name: EXCHANGES.BILLING, type: 'topic' },
            { name: EXCHANGES.ACCESS, type: 'topic' },
            { name: EXCHANGES.NOTIFICATION, type: 'topic' },
            { name: EXCHANGES.UPLOAD, type: 'topic' },
            { name: EXCHANGES.INTERACTION, type: 'topic' },
            { name: EXCHANGES.CONTENT, type: 'topic' },
            {
              name: EXCHANGES.CONTENT_SYNC,
              type: 'fanout',
              options: { arguments: { 'alternate-exchange': EXCHANGES.DEAD_LETTER } },
            },
            { name: EXCHANGES.DEAD_LETTER, type: 'direct' },
          ],
          uri: url,
          connectionInitOptions: { wait: false },
          enableControllerDiscovery: true,
        };
      },
    }),
  ],
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useExisting: AmqpConnection,
    },
  ],
  exports: [RabbitMQModule, RABBITMQ_CONNECTION],
})
export class MessagingModule {}
