# Notification Service

Notification Service la service trung tam de luu va gui thong bao cho he thong Luyen thi lai xe. Runtime hien tai dung NestJS HTTP + RabbitMQ microservice trong cung mot process.

Service ho tro 3 kenh:

- `IN_APP`: tao ban ghi trong database de frontend doc qua API.
- `EMAIL`: gui mail qua SMTP, local/dev thuong dung Mailpit.
- `PUSH`: gui push notification qua Firebase Cloud Messaging. Neu chua co Firebase credentials, provider se bo qua push that nhung service van chay.

Luong chinh la bat dong bo: service khac emit RabbitMQ event vao queue `notification_service_events`, notification-service consume event, tao notification, dispatch theo kenh phu hop, va de common `RabbitMqRetryInterceptor` xu ly retry/DLQ khi handler throw loi.

## Use Cases

- Gui welcome notification khi identity-service emit `identity.user.created`.
- Gui password reset email khi co event `identity.user.password-reset-requested`.
- Gui ket qua thi khi exam-service emit `exam.session.passed` hoac `exam.session.failed`.
- Tao academic warning qua `POST /admin/academic-warnings`, sau do queue event `notification.academic-warning.queued` de dispatch bat dong bo.
- Consume `course.updated` neu service khac route event nay vao notification queue.
- Dang ky/huy device token cho push notification.
- Cho user doc notification cua minh va danh dau da doc.

## Runtime Architecture

```txt
identity-service ----\
exam-service ---------+--> RabbitMQ queue: notification_service_events
notification HTTP ----/
course-service -------/
                                |
                                v
                         notification-service
                                |
               +----------------+----------------+
               v                v                v
            Postgres        SMTP/Mailpit       Firebase FCM
```

Thu muc quan trong:

```txt
src/
  main.ts                                  # HTTP + RMQ bootstrap, Swagger, metrics, retry/DLQ
  app.module.ts                            # Consul config, Keycloak guards, providers
  presentation/http/
    notification.controller.ts             # /notifications/me, /notifications/:id/read, /admin/academic-warnings
    device-token.controller.ts             # /notifications/devices
  presentation/messaging/
    messaging.controller.ts                # @EventPattern handlers
  application/use-cases/
    notification-dispatcher.service.ts
    send-welcome-email.use-case.ts
    send-password-reset.use-case.ts
    send-exam-result.use-case.ts
    send-academic-warning.use-case.ts
    send-course-update.use-case.ts
  infrastructure/messaging/
    notification-event.publisher.ts        # publish internal academic-warning event
  infrastructure/providers/
    smtp.provider.ts
    fcm-push.provider.ts
  infrastructure/persistence/prisma/
```

## Config

Khong can tao `.env` rieng trong `apps/notification-service`. Dat bien local/dev o file `.env` root repo.

```env
NOTIFICATION_SMTP_HOST=localhost
NOTIFICATION_SMTP_PORT=1025
NOTIFICATION_SMTP_USER=
NOTIFICATION_SMTP_PASS=
NOTIFICATION_SMTP_FROM=no-reply@luyen-thi-lai-xe.local
NOTIFICATION_FCM_CREDENTIALS=
NOTIFICATION_RETRY_MAX_ATTEMPTS=3
NOTIFICATION_RETRY_INTERVAL_MS=300000

NOTIFICATION_SMTP_HOST_LOCAL=localhost
NOTIFICATION_SMTP_PORT_LOCAL=1025
NOTIFICATION_SMTP_USER_LOCAL=
NOTIFICATION_SMTP_PASS_LOCAL=
NOTIFICATION_SMTP_FROM_LOCAL=no-reply@luyen-thi-lai-xe.local
NOTIFICATION_FCM_CREDENTIALS_LOCAL=
NOTIFICATION_RETRY_MAX_ATTEMPTS_LOCAL=3
NOTIFICATION_RETRY_INTERVAL_MS_LOCAL=300000
```

Config duoc resolve theo thu tu chung cua repo:

1. Environment variables.
2. Consul KV `config/<NODE_ENV>/notification-service/...`.
3. Default trong `app.module.ts`.

Consul keys quan trong:

| Key | Local default | Docker default | Ghi chu |
| --- | --- | --- | --- |
| `port` | `3006` | `3000` | Docker map host `3006:3000` |
| `database.url` | `postgresql://user:password@localhost:5437/notification_db` | `postgresql://user:password@db-notification:5432/notification_db` | DB rieng cua notification |
| `rabbitmq.url` | `amqp://localhost:5672` | `amqp://rabbitmq:5672` | Queue chinh `notification_service_events` |
| `smtp.host` | `localhost` | `mailpit` | Mailpit UI `http://localhost:8025` |
| `smtp.port` | `1025` | `1025` | SMTP dev |
| `smtp.from` | `no-reply@luyen-thi-lai-xe.local` | same | From address |
| `push.fcmCredentials` | empty | empty | Firebase service-account JSON; empty means push is skipped |
| `retry.maxAttempts` | `3` | `3` | So lan retry truoc khi vao DLQ |
| `retry.intervalMs` | `300000` | `300000` | Delay moi lan retry |

Sau khi sua `.env`, seed lai Consul:

```bash
npm run consul:seed:local
```

## Run Local

Tu root repo:

```bash
npm run infra:up
npm run consul:seed:local
npm --workspace=apps/notification-service run prisma:generate
npm --workspace=apps/notification-service run db:migrate
npm --workspace=apps/notification-service run start:dev
```

URL hay dung:

| Muc dich | URL |
| --- | --- |
| Swagger | `http://localhost:3006/docs` |
| Metrics | `http://localhost:3006/metrics` |
| Health | `http://localhost:3006/health` |
| Mailpit | `http://localhost:8025` |
| RabbitMQ UI | `http://localhost:15672` (`guest`/`guest`) |
| Consul UI | `http://localhost:8500` |

## HTTP API

| Method | Path | Ai dung | Muc dich |
| --- | --- | --- | --- |
| `GET` | `/notifications/me?page=1&size=20` | Authenticated user | Lay notification cua user hien tai theo JWT `sub` |
| `PATCH` | `/notifications/:id/read` | Authenticated user | Danh dau notification da doc |
| `POST` | `/notifications/devices` | App/mobile frontend | Dang ky device token |
| `DELETE` | `/notifications/devices/:token` | App/mobile frontend | Huy device token |
| `POST` | `/admin/academic-warnings` | `ADMIN`, `CENTER_MANAGER`, `INSTRUCTOR` | Queue academic warning, tra `202 Accepted` |
| `GET` | `/metrics` | Prometheus/internal | Scrape metrics |

Vi du tao academic warning:

```http
POST /admin/academic-warnings
Authorization: Bearer <admin_or_instructor_token>
Content-Type: application/json

{
  "studentIds": ["student-user-id-1", "student-user-id-2"],
  "reason": "ABSENT_TOO_MUCH",
  "severity": "HIGH",
  "message": "Ban da vang nhieu buoi hoc, vui long lien he trung tam.",
  "deliveryChannels": ["IN_APP"]
}
```

Endpoint nay chi cho request `IN_APP`. `EMAIL` va `PUSH` khong duoc yeu cau truc tiep tu admin API; notification-service se tu resolve theo config va payload event. Controller tao record `AcademicWarning`, publish event `notification.academic-warning.queued` kem `warningId`, roi tra `202 Accepted`.

Response:

```json
{
  "status": "ACCEPTED",
  "accepted": 2,
  "studentIds": ["student-user-id-1", "student-user-id-2"],
  "message": "Academic warning notifications were queued for asynchronous delivery."
}
```

## RabbitMQ Events

Service-to-service khong goi HTTP controller cua notification-service de gui notification noi bo. Hay emit event vao queue `notification_service_events`.

Trong service publisher, uu tien helper chung:

```ts
import { ClientsModule } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { createRabbitMqClientOptions } from '@repo/common';

export const NOTIFICATION_SERVICE_CLIENT = 'NOTIFICATION_SERVICE_CLIENT';

ClientsModule.registerAsync([
  {
    name: NOTIFICATION_SERVICE_CLIENT,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
      createRabbitMqClientOptions(configService, 'notification_service_events'),
  },
]);
```

Emit event:

```ts
await lastValueFrom(
  notificationClient.emit('course.updated', {
    recipientId: 'user-id',
    recipientEmail: 'student@example.com',
    courseId: 'course-id',
    courseTitle: 'B2 co ban',
    updateSummary: 'Khoa hoc vua duoc cap nhat lich hoc moi.',
  }),
);
```

Notification-service hien consume:

| Event pattern | Payload chinh | Kenh gui |
| --- | --- | --- |
| `identity.user.created` | `userId`, `email`, `fullName?` | `IN_APP`, `EMAIL` |
| `identity.user.password-reset-requested` | `userId`, `email`, `resetUrl` | `EMAIL` |
| `exam.session.passed` | `studentId` hoac `userId`, `email?`, `sessionId?`, `licenseCategory?`, `score?` | `IN_APP`, `PUSH`, them `EMAIL` neu co email |
| `exam.session.failed` | giong `exam.session.passed` | `IN_APP`, `PUSH`, them `EMAIL` neu co email |
| `notification.academic-warning.queued` | `warningId?`, `studentId`, `reason`, `severity`, `message`, `createdById`, `studentEmail?` | `IN_APP`, `PUSH`, them `EMAIL` neu co `studentEmail` |
| `course.updated` | `recipientId`, `recipientEmail?`, `courseId`, `courseTitle`, `updateSummary` | `IN_APP`, `PUSH`, them `EMAIL` neu co email |

## Retry Va DLQ

Runtime hien tai dung common `assertRabbitMqResilienceTopology` va `RabbitMqRetryInterceptor` tu `@repo/common`.

Topology:

| Thanh phan | Ten |
| --- | --- |
| Queue chinh | `notification_service_events` |
| Retry queue | `notification_service_events.retry.1`, `notification_service_events.retry.2`, ... |
| DLQ | `notification_service_events.dlq` |

So retry queue bang `retry.maxAttempts`. Moi retry queue co TTL bang `retry.intervalMs` va dead-letter routing quay lai queue chinh bang default exchange.

Luong loi:

1. Handler throw loi.
2. Interceptor ack message cu va publish message sang retry queue tiep theo, kem headers `x-retry-count`, `x-last-error`, `x-failed-at`.
3. Het TTL, RabbitMQ dua message ve `notification_service_events`.
4. Vuot `retry.maxAttempts`, interceptor publish message sang `notification_service_events.dlq`.

Luu y local: neu truoc do RabbitMQ da tao queue theo topology cu, co the gap `PRECONDITION_FAILED` khi start service. Xoa cac queue notification cu trong RabbitMQ UI hoac reset volume RabbitMQ local roi start lai.

## Database

Schema Prisma nam o `apps/notification-service/prisma/schema.prisma`.

| Model | Y nghia |
| --- | --- |
| `Notification` | Mot ban ghi notification/kienh gui, co `status`, `eventType`, `isRead`, `retryCount`, `errorMessage`, `deliveredAt` |
| `AcademicWarning` | Audit warning hoc tap, co delivery status va thong tin retry |
| `DeviceToken` | Device token cua user de gui push |

Lenh hay dung:

```bash
npm --workspace=apps/notification-service run prisma:generate
npm --workspace=apps/notification-service run db:migrate
npm --workspace=apps/notification-service run db:deploy
npm --workspace=apps/notification-service run db:seed
```

## Quick Checks

```bash
npm --workspace=apps/notification-service run check-types
npm --workspace=apps/notification-service run build
docker compose config --quiet
```

Neu doi contract event hoac endpoint, cap nhat them:

- `guides/api/api-spec-notification.md`
- `guides/testing/notification-service-test-guide.md`
- `docker/consul/init.sh`
- `consul-seed-development-local.json`
- `consul-seed-development.json`
- `consul-seed-production.json`
