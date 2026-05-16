/**
 * Diagnostic: Send a test RPC message directly to upload.video.commands
 * and check if the upload-service consumer responds
 */
import amqplib from 'amqplib';

const RABBITMQ_URL =
  'amqps://hujzkhnr:Hxc9jXXGqVEOaXpysq_DDrA47rt8B86W@turkey.rmq.cloudamqp.com/hujzkhnr';
const QUEUE = 'upload.video.commands';

async function main() {
  const conn = await amqplib.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  // Create a temporary exclusive queue for the reply
  const replyQueue = await ch.assertQueue('', { exclusive: true });
  const correlationId = `test-${Date.now()}`;

  console.log(`Reply queue: ${replyQueue.queue}`);
  console.log(`Correlation ID: ${correlationId}`);

  // Set up reply listener with timeout
  const timeout = setTimeout(() => {
    console.log('\n❌ TIMEOUT after 10s — consumer did NOT respond.');
    console.log('The upload-service consumer is connected but FROZEN.');
    conn.close().then(() => process.exit(1));
  }, 10_000);

  ch.consume(
    replyQueue.queue,
    (msg) => {
      if (msg && msg.properties.correlationId === correlationId) {
        clearTimeout(timeout);
        console.log('\n✅ REPLY RECEIVED from upload-service!');
        try {
          const content = JSON.parse(msg.content.toString());
          console.log('Response:', JSON.stringify(content, null, 2).substring(0, 500));
        } catch {
          console.log('Raw response:', msg.content.toString().substring(0, 500));
        }
        conn.close().then(() => process.exit(0));
      }
    },
    { noAck: true },
  );

  // Send a test RPC message mimicking NestJS ClientRMQ format
  const payload = {
    pattern: 'upload.get_upload_history_by_user',
    data: {
      eventId: `test-event-${Date.now()}`,
      eventName: 'upload.get_upload_history_by_user',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId,
      payload: {
        userId: 'd1ae4408-5058-45b6-a5ac-deb4e78781b5',
        contentType: 'resource',
        limit: 5,
      },
    },
    id: correlationId,
  };

  console.log(`\nSending test RPC to queue '${QUEUE}'...`);
  console.log(`Pattern: ${payload.pattern}`);

  ch.sendToQueue(QUEUE, Buffer.from(JSON.stringify(payload)), {
    replyTo: replyQueue.queue,
    correlationId,
    contentType: 'application/json',
  });

  console.log('Message sent. Waiting for reply (10s timeout)...');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
