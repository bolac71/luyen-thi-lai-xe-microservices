import axios from 'axios';

const timeoutMs = Number(process.env.RABBITMQ_SMOKE_TIMEOUT_MS ?? '5000');
const managementUrl = trimTrailingSlash(
  process.env.RABBITMQ_MANAGEMENT_URL ?? 'http://localhost:15672',
);
const prometheusUrl = trimTrailingSlash(
  process.env.RABBITMQ_PROMETHEUS_URL ?? 'http://localhost:15692',
);
const username = process.env.RABBITMQ_MANAGEMENT_USER ?? 'guest';
const password = process.env.RABBITMQ_MANAGEMENT_PASSWORD ?? 'guest';

const consumerQueues = parseCsv(process.env.RABBITMQ_CONSUMER_QUEUES) ?? [
  'user_service_events',
  'course_service_events',
  'exam_service_events',
  'question_service_events',
  'analytics_service_events',
  'notification_service_events',
  'media_service_events',
  'audit_service_events',
];

async function main(): Promise<void> {
  const failures: string[] = [];

  await checkManagementApi(failures);
  await checkPrometheusPlugin(failures);

  if (failures.length > 0) {
    console.error('[rabbitmq-resilience-smoke] Failures detected:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[rabbitmq-resilience-smoke] RabbitMQ resilience checks passed.');
}

async function checkManagementApi(failures: string[]): Promise<void> {
  try {
    const response = await axios.get(`${managementUrl}/api/queues/%2F`, {
      auth: { username, password },
      timeout: timeoutMs,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      failures.push(
        `management-api ${managementUrl}/api/queues/%2F -> HTTP ${response.status}`,
      );
      return;
    }

    if (!Array.isArray(response.data)) {
      failures.push('management-api returned non-array queue payload');
      return;
    }

    const queueNames = new Set(
      response.data
        .map((queue) =>
          typeof queue?.name === 'string' ? queue.name : undefined,
        )
        .filter(Boolean),
    );

    for (const queue of consumerQueues) {
      for (const expected of getExpectedQueues(queue)) {
        if (!queueNames.has(expected)) {
          failures.push(`missing queue topology: ${expected}`);
        }
      }
    }

    console.log('[rabbitmq-resilience-smoke] OK management topology');
  } catch (error) {
    failures.push(`management-api -> ${toErrorMessage(error)}`);
  }
}

async function checkPrometheusPlugin(failures: string[]): Promise<void> {
  try {
    const response = await axios.get(`${prometheusUrl}/metrics`, {
      timeout: timeoutMs,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      failures.push(
        `prometheus-plugin ${prometheusUrl}/metrics -> HTTP ${response.status}`,
      );
      return;
    }

    const metricsBody = String(response.data);
    if (!metricsBody.includes('rabbitmq_queue_messages_ready')) {
      failures.push(
        'prometheus-plugin missing rabbitmq_queue_messages_ready metric',
      );
      return;
    }

    console.log('[rabbitmq-resilience-smoke] OK prometheus plugin');
  } catch (error) {
    failures.push(`prometheus-plugin -> ${toErrorMessage(error)}`);
  }
}

function getExpectedQueues(queue: string): string[] {
  return [
    queue,
    `${queue}.retry.1`,
    `${queue}.retry.2`,
    `${queue}.retry.3`,
    `${queue}.dlq`,
  ];
}

function parseCsv(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.message || error.code || 'Request failed';
  }

  return error instanceof Error ? error.message : String(error);
}

void main();
