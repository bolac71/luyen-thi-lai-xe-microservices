# Phase 8.1-8.2 - Backup Strategy và Automated Daily Backup

Tài liệu này mô tả phạm vi backup và cơ chế tự động backup hằng ngày cho PostgreSQL và Keycloak DB.

## Phase 8.1 - Backup Strategy & Scope

Các database được backup:

| Service | Container | Database | User |
| ------- | --------- | -------- | ---- |
| `identity-service` | `db-identity` | `identity_db` | `user` |
| `user-service` | `db-user` | `user_db` | `user` |
| `exam-service` | `db-exam` | `exam_db` | `user` |
| `course-service` | `db-course` | `course_db` | `user` |
| `question-service` | `db-question` | `question_db` | `user` |
| `notification-service` | `db-notification` | `notification_db` | `user` |
| `analytics-service` | `db-analytics` | `analytics_db` | `user` |
| `simulation-service` | `db-simulation` | `simulation_db` | `user` |
| `media-service` | `db-media` | `media_db` | `user` |
| `audit-service` | `db-audit` | `audit_db` | `user` |
| `keycloak` | `db-keycloak` | `keycloak_db` | `keycloak` |

Backup dùng `pg_dump --format=custom` để tạo file `.dump`. Định dạng custom phù hợp cho restore bằng `pg_restore`, hỗ trợ kiểm tra metadata và linh hoạt hơn plain SQL.

Quy ước tên file:

```text
<service>_<env>_<yyyyMMddTHHmmssZ>.dump
```

Ví dụ:

```text
user-service_production_20260524T150000Z.dump
keycloak_production_20260524T150000Z.dump
```

Mỗi lần backup tạo thêm:

- File `.dump` cho từng database.
- File `.sha256` để kiểm tra checksum.
- `manifest.csv` ghi danh sách service, database, host, port và file dump.

Thư mục lưu:

```text
backups/postgres/<env>/<timestamp>/
```

`backups/` bị ignore bởi Git vì chứa dữ liệu thật.

## Phase 8.2 - Automated Daily Backup

Service `postgres-backup` đã được thêm vào:

- `docker-compose.infra.yml` cho local/hybrid.
- `docker-compose.deploy.yml` cho staging/production deploy.

Service này dùng image `postgres:15-alpine`, mount script:

```text
docker/backup/postgres-daily-backup.sh
```

Mặc định service sẽ:

- Chờ tất cả PostgreSQL containers healthy.
- Backup ngay khi container khởi động.
- Lặp lại mỗi `86400` giây, tương đương hằng ngày.
- Xóa backup cũ theo `BACKUP_RETENTION_DAYS`.

Biến môi trường chính:

| Biến | Mặc định | Ý nghĩa |
| ---- | -------- | ------- |
| `BACKUP_ROOT` | `/backups/postgres` | Thư mục backup trong container |
| `BACKUP_RETENTION_DAYS` | `7` | Số ngày giữ backup |
| `BACKUP_INTERVAL_SECONDS` | `86400` | Khoảng cách giữa 2 lần backup |
| `BACKUP_RUN_ONCE` | `false` | Chạy một lần rồi thoát |

Staging giữ mặc định 7 ngày. Production example đặt 14 ngày.

## Cách chạy local

Backup one-shot bằng script TypeScript cũ đã được chuẩn hóa lại:

```bash
npm run db:backup:local
```

Backup one-shot bằng chính container backup:

```bash
npm run db:backup:once
```

Chạy tự động cùng infra:

```bash
npm run infra:up
```

Sau khi chạy, kiểm tra thư mục:

```text
backups/postgres/development-local/<timestamp>/
```

## Kiểm tra nhanh file backup

Checksum:

```bash
sha256sum -c backups/postgres/<env>/<timestamp>/<file>.sha256
```

Liệt kê metadata bằng `pg_restore`:

```bash
pg_restore --list backups/postgres/<env>/<timestamp>/<file>.dump
```

Diễn tập restore đầy đủ sẽ được xử lý ở Phase 8.4.
