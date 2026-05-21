# Demo Seed Plan

Mục tiêu: sau khi frontend pull code và chạy migration, chỉ cần chạy một lệnh root `npm run db:seed` là có đủ dữ liệu demo cho luồng identity -> user profile -> course enrollment -> learning progress -> exam session -> notification -> simulation.

---

## Current Seed Audit

| Service | Seed status | Notes |
| --- | --- | --- |
| `identity-service` | Có script và có `prisma/seed.ts` | Hiện chỉ seed `admin@test.com` vào `identity_db`. Chưa seed bộ user demo đầy đủ cho student/instructor/center manager. |
| `user-service` | Có script trong `package.json`, thiếu file seed | `apps/user-service/package.json` trỏ tới `prisma/seed.ts` nhưng file chưa tồn tại. Root `npm run db:seed` sẽ fail khi chạy service này. |
| `question-service` | Có script và có seed lớn | Seed 6 topic và 600 câu hỏi từ `seed/600-cau-hoi.docx`. Đây là nguồn dữ liệu chính cho exam template/session. |
| `course-service` | Chưa có seed script | Chưa có course, lesson, material, enrollment, student license profile demo tự động. |
| `exam-service` | Chưa có seed script | Chưa có exam template demo tự động. Template hiện cần tạo thủ công qua API. |
| `analytics-service` | Chưa có seed script | Analytics có thể tự build từ event, nhưng demo cần seed read model trực tiếp hoặc replay event sau khi seed dữ liệu nguồn. |
| `notification-service` | Chưa có seed script | Chưa có warning/notification demo. |
| `simulation-service` | Chưa có seed script | Bảng `maneuvers`, `maneuver_checkpoints`, `maneuver_errors` đang không có dữ liệu mẫu, nên các API maneuver có thể trả empty array. |
| `media-service` | Chưa có seed script | Có thể để sau nếu demo chưa cần file thật. |

Root seed runner `scripts/prisma-seed-all.ts` hiện discover service có `db:seed` rồi sort theo tên service. Khi mở rộng seed demo, nên chuyển sang thứ tự phụ thuộc tường minh để tránh service sau cần dữ liệu từ service trước.

---

## Target Demo Dataset

### Identity/User

Seed deterministic ids để dễ dùng trong test guide và frontend fixtures.

| Role | Suggested count | Purpose |
| --- | ---: | --- |
| `ADMIN` | 1 | Quản trị toàn hệ thống |
| `CENTER_MANAGER` | 1 | Duyệt/cấu hình course, warning |
| `INSTRUCTOR` | 2 | Phụ trách course và xem progress student |
| `STUDENT` | 8-12 | Demo nhiều license tier, progress, notification, exam history |

User-service cần seed:

- `user_profiles` cho tất cả demo users.
- `student_details` cho students, gồm license tier `A1`, `B1`, `B2`.
- `license_assignment_audits` cho các student đã được assign license.

Course-service cũng cần seed `student_license_profiles` mirror từ user-service để enroll check license consistency không bị fail trong demo local.

### Question/Exam

Question-service hiện đã seed 600 câu hỏi. Exam-service nên seed template dựa trên topic ids thật từ question seed.

Suggested templates:

| License | Template | Questions | Passing | Duration |
| --- | --- | ---: | ---: | ---: |
| `A1` | `Đề thi A1 cơ bản` | 25 | 21 | 19 |
| `B1` | `Đề thi B1 cơ bản` | 30 | 26 | 20 |
| `B2` | `Đề thi B2 cơ bản` | 35 | 32 | 22 |
| `B2` | `Đề thi B2 nâng cao` | 35 | 32 | 22 |

Each template should have `topicDistribution` across the 6 seeded question topics. Keep ids deterministic or look up by `chapter` so the seed remains stable if deterministic topic ids change later.

### Course

Suggested course data:

- 2 active courses for `A1`.
- 2 active courses for `B1`.
- 2 active courses for `B2`.
- 1 draft course and 1 archived course for admin UI states.
- 5-8 lessons per active course.
- 2-3 materials per course with placeholder `fileUrl` or `mediaFileId`.
- Instructor assignments for seeded instructor ids.
- Requirements with realistic attendance/pass-score settings.
- Enrollments for seeded students:
  - some `ACTIVE` with 20-80% progress,
  - some `COMPLETED`,
  - some untouched to demo empty state.

### Analytics

Analytics can be derived from events during real usage, but seed should directly upsert read models for demo speed.

Seed:

- `student_learning_profiles` for every demo student.
- `daily_activities` for the last 7-14 days.
- `question_accuracy_trackers` for 3-5 weak topics/questions per active student.

This makes `GET /analytics/me/progress` useful immediately, without requiring the frontend demo to replay lessons/exams first.

### Notification

Seed:

- 2-4 notifications per demo student.
- At least one academic warning with `LOW_EXAM_SCORE` and `HIGH` severity.
- Mixed `isRead` true/false for badge demo.

### Simulation

Seed maneuver content because simulation APIs depend on it.

Suggested B1/B2 dataset:

- 10-12 maneuvers:
  - xuất phát,
  - dừng xe nhường đường người đi bộ,
  - dừng và khởi hành ngang dốc,
  - qua vệt bánh xe và đường hẹp vuông góc,
  - qua ngã tư có tín hiệu,
  - đường vòng quanh co,
  - ghép xe dọc,
  - tạm dừng nơi có đường sắt,
  - tăng tốc/chuyển số,
  - ghép xe ngang,
  - kết thúc.
- 3-5 checkpoints per maneuver.
- 20-30 maneuver errors with `MINOR`, `MAJOR`, `CRITICAL` severities.
- Optional sample completed sessions for seeded students if frontend needs history/state examples.

---

## Implementation Plan

### Phase 1 - Fix seed runner foundation

1. Add a deterministic service seed order in `scripts/prisma-seed-all.ts`:
   `identity-service`, `user-service`, `question-service`, `exam-service`, `course-service`, `analytics-service`, `notification-service`, `simulation-service`.
2. Keep the ability to run a single service:
   `npm run db:seed:question`, `tsx scripts/prisma-seed-all.ts simulation-service`.
3. Make seed scripts idempotent with `upsert`, `deleteMany` scoped by deterministic ids, or natural unique keys.
4. Fix missing `apps/user-service/prisma/seed.ts` or remove the script until the seed exists. Recommended: implement the seed because user profile/license data is central to demo flows.

### Phase 2 - Seed base identities and profiles

1. Extend identity seed with deterministic demo users.
2. Seed user profiles and student details with matching ids.
3. Seed license assignment audit rows for students.
4. Seed course-service `student_license_profiles` mirror rows to support license consistency during enroll.

### Phase 3 - Seed learning content

1. Reuse existing question-service seed for 600 questions.
2. Add exam-service seed for active templates per license category.
3. Add course-service seed for courses, lessons, materials, requirements, instructors, enrollments.
4. Add simulation-service seed for maneuvers/checkpoints/errors.

### Phase 4 - Seed demo state

1. Seed analytics read models for dashboard pages.
2. Seed notification rows and academic warnings.
3. Optionally seed exam sessions only if frontend needs history before the user starts/submits a real exam. Prefer creating exam history through exam APIs in demo scripts because snapshots are domain-sensitive.

### Phase 5 - Documentation and verification

1. Update service testing guides with `npm run db:seed` as the standard demo setup.
2. Add a seed verification section:
   - course list has active courses,
   - exam templates exist,
   - simulation maneuvers return non-empty arrays,
   - analytics progress returns non-zero demo data,
   - notifications list returns seeded unread items.
3. Add smoke script or checklist for frontend:
   - login demo student,
   - view courses,
   - enroll matching license course,
   - start exam,
   - view progress,
   - view notifications,
   - open simulation maneuver list.

---

## Acceptance Criteria

- `npm run db:deploy` then `npm run db:seed` completes from repo root without manual per-service commands.
- The seed is safe to rerun.
- No seed depends on external HTTP services unless explicitly documented.
- Frontend can load useful data immediately for course, exam, analytics, notification, and simulation screens.
- Simulation maneuver APIs return non-empty data for at least `B1` and `B2`.
- Course enrollment demo does not fail with `STUDENT_LICENSE_NOT_ASSIGNED` after seed.
- API/test docs reference deterministic demo ids and accounts.
