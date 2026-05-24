import { Inject, Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';
import { METRICS_MODULE_OPTIONS } from './metrics.constants';

export interface MetricsModuleOptions {
  serviceName: string;
}

export interface HttpMetricInput {
  method: string;
  route: string;
  statusCode: number;
  durationSeconds: number;
}

export interface RabbitMqRetryMetricInput {
  queue: string;
  targetQueue: string;
  retryCount: number;
}

@Injectable()
export class MetricsService {
  private static readonly registries = new Map<string, Registry>();
  private static readonly requestCounters = new Map<string, Counter<string>>();
  private static readonly requestDurationHistograms = new Map<
    string,
    Histogram<string>
  >();
  private static readonly rabbitMqMessageCounters = new Map<
    string,
    Counter<string>
  >();
  private static readonly rabbitMqRetryCounters = new Map<
    string,
    Counter<string>
  >();
  private static readonly rabbitMqDeadLetterCounters = new Map<
    string,
    Counter<string>
  >();

  readonly registry: Registry;
  private readonly requestCounter: Counter<string>;
  private readonly requestDurationHistogram: Histogram<string>;
  private readonly rabbitMqMessageCounter: Counter<string>;
  private readonly rabbitMqRetryCounter: Counter<string>;
  private readonly rabbitMqDeadLetterCounter: Counter<string>;

  constructor(@Inject(METRICS_MODULE_OPTIONS) options: MetricsModuleOptions) {
    const serviceName = sanitizeLabelValue(options.serviceName);
    this.registry = this.getOrCreateRegistry(serviceName);
    this.requestCounter = this.getOrCreateRequestCounter(serviceName);
    this.requestDurationHistogram =
      this.getOrCreateRequestDurationHistogram(serviceName);
    this.rabbitMqMessageCounter =
      this.getOrCreateRabbitMqMessageCounter(serviceName);
    this.rabbitMqRetryCounter =
      this.getOrCreateRabbitMqRetryCounter(serviceName);
    this.rabbitMqDeadLetterCounter =
      this.getOrCreateRabbitMqDeadLetterCounter(serviceName);
  }

  recordHttpRequest(input: HttpMetricInput): void {
    const labels = {
      method: input.method,
      route: normalizeRoute(input.route),
      status_code: String(input.statusCode),
      status_class: `${Math.trunc(input.statusCode / 100)}xx`,
    };

    this.requestCounter.inc(labels);
    this.requestDurationHistogram.observe(labels, input.durationSeconds);
  }

  recordRabbitMqMessage(queue: string, outcome: 'success' | 'retry' | 'dlq') {
    this.rabbitMqMessageCounter.inc({ queue, outcome });
  }

  recordRabbitMqRetry(input: RabbitMqRetryMetricInput): void {
    this.rabbitMqRetryCounter.inc({
      queue: input.queue,
      retry_queue: input.targetQueue,
      retry_count: String(input.retryCount),
    });
  }

  recordRabbitMqDeadLetter(input: RabbitMqRetryMetricInput): void {
    this.rabbitMqDeadLetterCounter.inc({
      queue: input.queue,
      dlq: input.targetQueue,
      retry_count: String(input.retryCount),
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  private getOrCreateRegistry(serviceName: string): Registry {
    const existing = MetricsService.registries.get(serviceName);
    if (existing) {
      return existing;
    }

    const registry = new Registry();
    registry.setDefaultLabels({ service: serviceName });
    collectDefaultMetrics({
      prefix: 'nodejs_',
      register: registry,
    });

    MetricsService.registries.set(serviceName, registry);
    return registry;
  }

  private getOrCreateRequestCounter(serviceName: string): Counter<string> {
    const existing = MetricsService.requestCounters.get(serviceName);
    if (existing) {
      return existing;
    }

    const counter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests handled by the service.',
      labelNames: ['method', 'route', 'status_code', 'status_class'],
      registers: [this.registry],
    });

    MetricsService.requestCounters.set(serviceName, counter);
    return counter;
  }

  private getOrCreateRequestDurationHistogram(
    serviceName: string,
  ): Histogram<string> {
    const existing = MetricsService.requestDurationHistograms.get(serviceName);
    if (existing) {
      return existing;
    }

    const histogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds.',
      labelNames: ['method', 'route', 'status_code', 'status_class'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    MetricsService.requestDurationHistograms.set(serviceName, histogram);
    return histogram;
  }

  private getOrCreateRabbitMqMessageCounter(
    serviceName: string,
  ): Counter<string> {
    const existing = MetricsService.rabbitMqMessageCounters.get(serviceName);
    if (existing) {
      return existing;
    }

    const counter = new Counter({
      name: 'rabbitmq_messages_processed_total',
      help: 'Total number of RabbitMQ messages handled by the service.',
      labelNames: ['queue', 'outcome'],
      registers: [this.registry],
    });

    MetricsService.rabbitMqMessageCounters.set(serviceName, counter);
    return counter;
  }

  private getOrCreateRabbitMqRetryCounter(
    serviceName: string,
  ): Counter<string> {
    const existing = MetricsService.rabbitMqRetryCounters.get(serviceName);
    if (existing) {
      return existing;
    }

    const counter = new Counter({
      name: 'rabbitmq_message_retries_total',
      help: 'Total number of RabbitMQ messages scheduled for retry.',
      labelNames: ['queue', 'retry_queue', 'retry_count'],
      registers: [this.registry],
    });

    MetricsService.rabbitMqRetryCounters.set(serviceName, counter);
    return counter;
  }

  private getOrCreateRabbitMqDeadLetterCounter(
    serviceName: string,
  ): Counter<string> {
    const existing = MetricsService.rabbitMqDeadLetterCounters.get(serviceName);
    if (existing) {
      return existing;
    }

    const counter = new Counter({
      name: 'rabbitmq_messages_dead_lettered_total',
      help: 'Total number of RabbitMQ messages routed to a dead letter queue.',
      labelNames: ['queue', 'dlq', 'retry_count'],
      registers: [this.registry],
    });

    MetricsService.rabbitMqDeadLetterCounters.set(serviceName, counter);
    return counter;
  }
}

function normalizeRoute(route: string): string {
  const normalized = route.split('?')[0]?.trim() || '/';
  return normalized.length > 120
    ? `${normalized.slice(0, 117)}...`
    : normalized;
}

function sanitizeLabelValue(value: string): string {
  return value.trim() || 'unknown-service';
}
