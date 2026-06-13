export function getRabbitMqUrl() {
  const url = process.env.RABBITMQ_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (!url) {
    throw new Error('Set RABBITMQ_URL before running this diagnostic script');
  }

  return url;
}
