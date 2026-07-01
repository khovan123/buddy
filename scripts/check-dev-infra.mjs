#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const REQUIRED_PORTS = [
  { port: '5432', expectedContainer: 'ms_postgres', service: 'PostgreSQL' },
  { port: '6379', expectedContainer: 'ms_redis', service: 'Redis' },
  { port: '5672', expectedContainer: 'ms_rabbitmq', service: 'RabbitMQ' },
  { port: '27018', expectedContainer: 'ms_mongodb', service: 'MongoDB' },
  { port: '6333', expectedContainer: 'ms_qdrant', service: 'Qdrant' },
];

function getRunningContainers() {
  try {
    const output = execFileSync(
      'docker',
      ['ps', '--format', '{{.Names}}\t{{.Ports}}'],
      { encoding: 'utf8' }
    );

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ports = ''] = line.split('\t');
        return { name, ports };
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to inspect running Docker containers.');
    console.error(message);
    process.exit(1);
  }
}

function findConflicts(containers) {
  return REQUIRED_PORTS.flatMap(({ port, expectedContainer, service }) => {
    return containers
      .filter(
        ({ name, ports }) =>
          name !== expectedContainer &&
          (ports.includes(`0.0.0.0:${port}->`) || ports.includes(`[::]:${port}->`))
      )
      .map(({ name, ports }) => ({ port, expectedContainer, service, name, ports }));
  });
}

const conflicts = findConflicts(getRunningContainers());

if (conflicts.length > 0) {
  console.error('Local infrastructure port conflict detected.\n');

  for (const conflict of conflicts) {
    console.error(
      `- ${conflict.service} needs localhost:${conflict.port}, but ${conflict.name} already publishes it (${conflict.ports}).`
    );
  }

  console.error(
    '\nStop the conflicting container(s) or change their published ports, then rerun `npm run dev`.'
  );
  process.exit(1);
}
