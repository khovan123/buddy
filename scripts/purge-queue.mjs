/**
 * Purge stuck messages from upload.video.commands queue
 * and verify the queue is clean
 */
import amqplib from 'amqplib';
import { getRabbitMqUrl } from './rabbitmq-env.mjs';

const RABBITMQ_URL = getRabbitMqUrl();
const QUEUE = 'upload.video.commands';

async function main() {
  const conn = await amqplib.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  const before = await ch.checkQueue(QUEUE);
  console.log(`Before purge: ${before.messageCount} messages, ${before.consumerCount} consumers`);

  const purged = await ch.purgeQueue(QUEUE);
  console.log(`Purged ${purged.messageCount} messages`);

  const after = await ch.checkQueue(QUEUE);
  console.log(`After purge: ${after.messageCount} messages, ${after.consumerCount} consumers`);

  await ch.close();
  await conn.close();
  console.log('\nDone. Now restart the upload-service (touch main.ts or Ctrl+C + npm run dev).');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
