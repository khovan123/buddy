/**
 * Diagnostic: Check RabbitMQ queue status
 * Shows message count and consumer count for the upload.video.commands queue
 */
import amqplib from 'amqplib';

const RABBITMQ_URL =
  'amqps://hujzkhnr:Hxc9jXXGqVEOaXpysq_DDrA47rt8B86W@turkey.rmq.cloudamqp.com/hujzkhnr';
const QUEUE = 'upload.video.commands';

async function main() {
  console.log(`Connecting to RabbitMQ...`);
  const conn = await amqplib.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  // checkQueue returns { queue, messageCount, consumerCount }
  const info = await ch.checkQueue(QUEUE);
  console.log(`\nQueue: ${info.queue}`);
  console.log(`  Messages waiting: ${info.messageCount}`);
  console.log(`  Active consumers: ${info.consumerCount}`);

  if (info.consumerCount === 0) {
    console.log(
      `\n⚠️  NO CONSUMERS! The upload-service microservice is NOT connected to RabbitMQ.`,
    );
    console.log(`   This is why RPC messages are never received.`);
  } else {
    console.log(`\n✅ Upload-service consumer is connected.`);
  }

  if (info.messageCount > 0) {
    console.log(
      `\n⚠️  ${info.messageCount} messages stuck in queue (possibly from previous crash).`,
    );
    console.log(`   These could be blocking new messages if prefetch is full.`);
  }

  await ch.close();
  await conn.close();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
