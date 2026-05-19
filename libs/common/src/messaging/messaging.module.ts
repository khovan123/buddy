import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { EXCHANGES } from '../config/rabbitmq.config';

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
            { name: EXCHANGES.DEAD_LETTER, type: 'direct' },
          ],
          uri: url,
          connectionInitOptions: { wait: true },
          enableControllerDiscovery: true,
        };
      },
    }),
  ],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
