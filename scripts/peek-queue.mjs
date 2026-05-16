/**
 * Diagnostic: Peek at messages in the upload.video.commands queue
 * Gets them without acking to see what's stuck
 */
import amqplib from 'amqplib';

const RABBITMQ_URL =
  'amqps://hujzkhnr:Hxc9jXXGqVEOaXpysq_DDrA47rt8B86W@turkey.rmq.cloudamqp.com/hujzkhnr';
const QUEUE = 'upload.video.commands';

async function main() {
  const conn = await amqplib.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.prefetch(1);

  // Get one message without acking to peek
  const msg = await ch.get(QUEUE, { noAck: false });
  if (msg) {
    console.log('--- Message found ---');
    console.log('Routing key:', msg.fields.routingKey);
    console.log('Redelivered:', msg.fields.redelivered);
    console.log('Reply-to:', msg.properties.replyTo);
    console.log('Correlation ID:', msg.properties.correlationId);

    try {
      const content = JSON.parse(msg.content.toString());
      console.log('Pattern:', content.pattern);
      console.log(
        'Payload:',
        JSON.stringify(content.data?.payload || content.data, null, 2)?.substring(0, 500),
      );
    } catch {
      console.log('Raw content:', msg.content.toString().substring(0, 500));
    }

    // NACK to put it back (don't consume it)
    ch.nack(msg, false, true);
  } else {
    console.log('Queue is empty');
  }

  await ch.close();
  await conn.close();
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
