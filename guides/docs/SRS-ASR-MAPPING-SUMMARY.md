# SRS Use Case to ASR & Design Pattern Mapping Guide

Tài liệu này cung cấp bản đồ đối chiếu (Mapping) chi tiết giữa các **Use Cases** trong tài liệu Đặc tả Yêu cầu Hệ thống (`context/SRS.docx`), các **Kịch bản thuộc tính chất lượng (ASR)** trong tài liệu kiến trúc (`context/ASR.xlsx`), và vị trí **Source Code** tương ứng trong dự án **DriveMate**.

---

## 🗺️ 1. Bản Đồ Đối Chiếu Chi Tiết (Use Case ➔ ASR ➔ Source Code)

### 🔐 Nhóm 1: Quản Lý Người Dùng & Bảo Mật (User & Security)

#### UC01: Đăng Nhập (Login)
* **Mô tả:** Học viên, Giáo viên, Quản trị viên đăng nhập vào hệ thống.
* **ASR liên quan:** `ASR-SEC-01` (Stateless Authentication), `ASR-PERF-01` (Login Latency).
* **Vị trí Source Code:**
  * Controller: [auth.controller.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/identity-service/src/presentation/http/auth.controller.ts)
  * Service liên kết Keycloak: [keycloak-admin.service.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/identity-service/src/infrastructure/keycloak-admin/keycloak-admin.service.ts)
* **Design Pattern:** **Stateless Authentication Tactic** (Đăng nhập không trạng thái qua JWT được ký và phân phối bởi Keycloak. Brute-force protection được xử lý độc lập tại Keycloak's gateway).

#### UC02: Quên Mật Khẩu (Forgot Password)
* **Mô tả:** Người dùng yêu cầu link reset mật khẩu qua email.
* **ASR liên quan:** `ASR-SEC-02` (Reset Link Security).
* **Vị trí Source Code:**
  * Use Case: [forgot-password.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/identity-service/src/application/use-cases/forgot-password/forgot-password.use-case.ts)
* **Design Pattern:** **Token Lifecycle Pattern** (Reset token có TTL = 15 phút, lưu trữ tạm thời và tự động hết hạn, vô hiệu hóa ngay sau lần sử dụng đầu tiên).

#### UC03: Tạo Tài Khoản (Create User)
* **Mô tả:** Admin hoặc hệ thống tạo tài khoản mới.
* **ASR liên quan:** `ASR-SEC-04` (Email Uniqueness & RBAC).
* **Vị trí Source Code:**
  * Use Case: [create-user.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/identity-service/src/application/use-cases/create-user/create-user.use-case.ts)
  * Lắng nghe đồng bộ profile: [identity-event.handler.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/user-service/src/application/event-handlers/identity-event.handler.ts)
* **Design Pattern:** **Publish-Subscribe Pattern** (Đồng bộ tài khoản bất đồng bộ giữa `identity-service` và `user-service` qua RabbitMQ event `identity.user.created`).

#### UC05: Khóa Tài Khoản (Lock User)
* **Mô tả:** Khóa tài khoản do vi phạm hoặc quá số lần đăng nhập.
* **ASR liên quan:** `ASR-SEC-01` (Lockout policy).
* **Vị trí Source Code:**
  * Use Case: [lock-user.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/identity-service/src/application/use-cases/lock-user/lock-user.use-case.ts)
* **Design Pattern:** **Delegation Pattern** (Ủy thác cơ chế khóa tài khoản tạm thời cho cấu hình Brute Force Detection của Keycloak).

#### UC06: Gán Hạng Bằng Lái (Assign License Category)
* **Mô tả:** Gán hạng bằng lái (B1, B2, C,...) cho học viên.
* **ASR liên quan:** `ASR-DI-05` (One Active License), `ASR-SEC-04` (RBAC).
* **Vị trí Source Code:**
  * Use Case: [assign-license-tier.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/user-service/src/application/use-cases/assign-license-tier/assign-license-tier.use-case.ts)
* **Design Pattern:** **Transactional Outbox Pattern** (Đảm bảo việc cập nhật hạng bằng lái của học viên trong DB và bắn event `user.student.license-assigned` sang `course-service` được ghi đồng thời trong 1 transaction).

#### UC33: Đăng Xuất (Logout)
* **Mô tả:** Đăng xuất tài khoản, hủy bỏ token.
* **ASR liên quan:** `ASR-SEC-03` (Session Revocation).
* **Vị trí Source Code:**
  * Use Case: [logout.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/identity-service/src/application/use-cases/logout/logout.use-case.ts)
  * Global Guard: [token-blacklist.guard.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/identity-service/src/infrastructure/guards/token-blacklist.guard.ts)
* **Design Pattern:** **Token Blacklist Pattern** (Khi logout, token `jti` được đưa vào Redis blacklist với TTL bằng thời hạn còn lại của token. Guard ở API Gateway chặn đứng các token nằm trong blacklist).

---

### 📚 Nhóm 2: Quản Lý Khóa Học (Course Catalog)

#### UC07: Xem Chi Tiết Khóa Học (View Detailed Course)
* **Mô tả:** Học viên xem danh sách và chi tiết các bài học của khóa học.
* **ASR liên quan:** `ASR-PERF-05` (Course Detail Cache).
* **Vị trí Source Code:**
  * Controller: [course.controller.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/course-service/src/presentation/http/course.controller.ts)
  * Dịch vụ Cache: [redis-cache.service.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/packages/common/src/cache/redis-cache.service.ts) hoặc NestJS `CacheManager`.
* **Design Pattern:** **Cache-Aside Pattern** (Lưu đệm thông tin khóa học vào in-memory cache với TTL 5-10 phút. Nếu cache hit, trả về ngay lập tức; nếu cache miss, truy vấn DB và ghi lại vào cache).

#### UC08 & UC09: Tạo & Cập Nhật Khóa Học (Create & Update Course)
* **Mô tả:** Quản lý tạo mới hoặc sửa thông tin khóa học.
* **ASR liên quan:** `ASR-PERF-05` (Cache Invalidation), `ASR-DI-06` (PATCH update).
* **Vị trí Source Code:**
  * Use Case: [create-course.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/course-service/src/application/use-cases/create-course/create-course.use-case.ts)
  * Use Case: [update-course.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/course-service/src/application/use-cases/update-course/update-course.use-case.ts)
* **Design Pattern:** 
  * **Cache Invalidation Tactic** (Xóa sạch cache của khóa học tương ứng ngay sau khi thực hiện hành động Write/Mutation thành công).
  * **Optimistic Concurrency Control (OCC)** (Sử dụng trường `version` trong DB. Khi update, kiểm tra nếu version không đổi thì mới ghi đè, tránh xung đột dữ liệu khi nhiều người sửa cùng lúc).

#### UC10: Xóa Khóa Học (Delete Course)
* **Mô tả:** Quản lý xóa khóa học khỏi catalog.
* **ASR liên quan:** `ASR-DI-10` (Course Referential Integrity).
* **Vị trí Source Code:**
  * Use Case: [delete-course.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/course-service/src/application/use-cases/delete-course/delete-course.use-case.ts)
* **Design Pattern:** **Soft-Delete Pattern** (Không xóa vật lý bản ghi trong DB mà gán cờ `isDeleted = true`. Luồng query mặc định ẩn các record này nhưng dữ liệu lịch sử thi cử vẫn liên kết toàn vẹn).

---

### 📝 Nhóm 3: Thi Lý Thuyết (Theory Exam Engine)

#### UC11: Làm Bài Thi Lý Thuyết (Take Theory Exam)
* **Mô tả:** Học viên mở đề thi và bắt đầu tính giờ.
* **ASR liên quan:** `ASR-REL-02` (Server Timer), `ASR-PERF-12` (Generation Latency).
* **Vị trí Source Code:**
  * Use Case: [start-session.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/exam-service/src/application/use-cases/start-session/start-session.use-case.ts)
* **Design Pattern:** **Exam Config Snapshot Pattern** (Tại thời điểm sinh đề thi, toàn bộ câu hỏi và cấu hình điểm liệt, điểm đậu của đề thi được copy cứng vào bảng `exam_session_questions` để đóng băng dữ liệu, thay đổi cấu hình sau này của Admin không làm ảnh hưởng đến bài thi lịch sử).

#### UC12: Quản Lý Phiên Thi (Manage Exam Session - Lưu Đáp Án)
* **Mô tả:** Tự động lưu đáp án học viên chọn trong lúc làm bài (Autosave).
* **ASR liên quan:** `ASR-REL-03` (Idempotent Auto-Save), `ASR-SEC-05` (Confidentiality).
* **Vị trí Source Code:**
  * Use Case: [save-answer.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/exam-service/src/application/use-cases/save-answer/save-answer.use-case.ts)
* **Design Pattern:** **Idempotent Write Tactic** (Client tự động autosave mỗi 5s. API sử dụng cú pháp SQL Update dựa trên cặp khóa duy nhất `(examSessionId, questionId)` thay vì Insert, giúp request nộp trùng lặp không sinh ra dòng lỗi hay ghi đè sai).

#### UC13 & UC14: Nộp Bài & Chấm Điểm (Submit & Grade Exam)
* **Mô tả:** Học viên nộp bài thi, hệ thống tính toán kết quả đỗ/trượt.
* **ASR liên quan:** `ASR-REL-04` (Atomic Submit), `ASR-DI-01` (Authoritative Grading), `ASR-DI-02` (Kill-Question scoring), `ASR-DI-07` (SRS Outbox).
* **Vị trí Source Code:**
  * Use Case: [submit-session.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/exam-service/src/application/use-cases/submit-session/submit-session.use-case.ts)
* **Design Pattern:** 
  * **Database Transaction (Unit of Work)** (Việc cập nhật trạng thái session sang `COMPLETED`, tính điểm chấm thi, kiểm tra câu hỏi điểm liệt, ghi kết quả thi và ghi outbox message được bọc trong một transaction duy nhất để đảm bảo tính toàn vẹn dữ liệu).
  * **Rule Engine Pattern (Chấm điểm câu hỏi điểm liệt)**: Duyệt qua mảng câu hỏi, kiểm tra nếu có bất kỳ câu nào là điểm liệt (`isCritical === true`) mà trả lời sai (`isCorrect === false`), thì dù tổng điểm có đạt điểm đỗ, bài thi vẫn bị đánh trượt ngay lập tức (`failedByCritical = true`).

---

### 📊 Nhóm 4: Báo Cáo & Phân Tích (Analytics & Missed Questions)

#### UC26 & UC34: Theo Dõi Tiến Độ Học Tập (Track Learning Progress)
* **Mô tả:** Học viên hoặc quản lý xem biểu đồ tiến độ học tập và các chủ đề yếu.
* **ASR liên quan:** `ASR-PERF-04` (Dashboard statistics), `ASR-PERF-07` (Progress chart).
* **Vị trí Source Code:**
  * Use Case: [get-progress.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/analytics-service/src/application/use-cases/get-progress/get-progress.use-case.ts)
  * Projection Handler: [exam-event.handler.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/analytics-service/src/application/event-handlers/exam-event.handler.ts)
* **Design Pattern:** **CQRS (Command Query Responsibility Segregation)** (Tách biệt dữ liệu. Tầng Write ghi log thi cử ở `exam_db`. Tầng Read ở `analytics_db` lắng nghe event nộp bài để cập nhật vào bảng thống kê pre-aggregated `ProgressStat`, giúp API đọc dashboard trả kết quả trong < 200 ms mà không cần tính toán lại dữ liệu thô).

#### UC32: Ôn Tập Các Câu Hay Sai (Review Missed Questions)
* **Mô tả:** Xem lại danh sách các câu hỏi thường xuyên trả lời sai.
* **ASR liên quan:** `ASR-PERF-09` (Lightweight SRS).
* **Vị trí Source Code:**
  * Use Case: [list-missed-questions.use-case.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/apps/exam-service/src/application/use-cases/list-missed-questions/list-missed-questions.use-case.ts)
* **Design Pattern:** **Spaced Repetition Algorithm** (Thuật toán lặp lại ngắt quãng chỉ lấy mảng câu hỏi sai trong thời gian giới hạn `period` và sắp xếp theo số lần sai `frequency` hoặc độ gần nhất `recent`, tránh quét toàn bộ dữ liệu lịch sử thi).

---

## 🏗️ 2. Mô Tả Chi Tiết Các Design Patterns Cốt Lõi

Đây là phần tài liệu lý thuyết và thực tiễn để bạn dùng làm luận điểm bảo vệ trước thầy:

### 1. Transactional Outbox Pattern
* **Mô tả mẫu thiết kế:**
  Trong kiến trúc Microservices, khi thực hiện một hành động ghi vào DB của service (vd: Đăng ký học viên) và cần thông báo cho service khác (vd: gửi mail chào mừng), việc gọi trực tiếp Message Broker (RabbitMQ) trong request của API là một "anti-pattern" (vì nếu RabbitMQ sập, DB sẽ bị rollback hoặc mất tính nhất quán).
  **Transactional Outbox Pattern** giải quyết việc này bằng cách: ghi dữ liệu nghiệp vụ chính và dữ liệu event (nằm trong bảng `outbox_messages`) **trong cùng một Database Transaction**. Một tiến trình chạy ngầm (Outbox Publisher) sẽ quét bảng này để đẩy sang RabbitMQ và đánh dấu `PUBLISHED` sau khi gửi thành công.
* **Hình vẽ luồng hoạt động:**
  ```mermaid
  sequenceDiagram
    participant Client
    participant Service DB
    participant Outbox Table
    participant Outbox Publisher
    participant RabbitMQ
    
    Client->>Service DB: Gửi request thay đổi nghiệp vụ (Start Transaction)
    Service DB->>Service DB: Lưu dữ liệu nghiệp vụ chính
    Service DB->>Outbox Table: Chèn Event trạng thái PENDING
    Service DB->>Client: Commit Transaction & trả kết quả OK
    loop Định kỳ mỗi giây
        Outbox Publisher->>Outbox Table: Quét các event PENDING
        Outbox Publisher->>RabbitMQ: Publish Event lên Broker
        RabbitMQ-->>Outbox Publisher: Xác nhận đã nhận (ACK)
        Outbox Publisher->>Outbox Table: Cập nhật trạng thái thành PUBLISHED
    end
  ```

### 2. CQRS (Command Query Responsibility Segregation)
* **Mô tả mẫu thiết kế:**
  Tách biệt hoàn toàn luồng Ghi dữ liệu (Commands) và luồng Đọc dữ liệu (Queries).
  Trong DriveMate, dữ liệu thi được học viên ghi liên tục vào bảng nhật ký thi của `exam-service`. Nếu dùng bảng này để tính toán biểu đồ tiến độ học tập thời gian thực, DB sẽ bị quá tải.
  Chúng ta áp dụng CQRS bằng cách: `analytics-service` lắng nghe event từ hàng đợi để cập nhật sang một cơ sở dữ liệu tối ưu cho việc đọc (`analytics_db`). Khi học viên mở dashboard, API chỉ việc select trực tiếp từ bảng thống kê đã được tính toán sẵn này.
* **Hình vẽ luồng hoạt động:**
  ```mermaid
  graph LR
    Client[Học viên] -->|1. Submit Exam| CommandService[Exam Service - Write]
    CommandService -->|2. Save DB| WriteDB[(exam_db)]
    CommandService -->|3. Publish Event| Broker[RabbitMQ Broker]
    Broker -->|4. Consume Event| ReadService[Analytics Service - Read]
    ReadService -->|5. Update Stats| ReadDB[(analytics_db)]
    Client -->|6. View Dashboard| ReadService
  ```

### 3. Circuit Breaker Pattern (Ngắt Mạch Lỗi)
* **Mô tả mẫu thiết kế:**
  Khi một service gọi một API của service khác đang bị lỗi hoặc quá tải, việc tiếp tục gửi request sẽ làm treo luồng xử lý của service gọi (cascading failure) và làm sập hoàn toàn service bị lỗi.
  **Circuit Breaker** hoạt động như một cầu chì:
  * **Trạng thái Closed (Đóng mạch):** Các cuộc gọi API diễn ra bình thường.
  * **Trạng thái Open (Hở mạch):** Nếu số lần gọi lỗi liên tiếp vượt ngưỡng (Threshold), breaker sẽ tự động ngắt, trả lỗi ngay lập tức (fail-fast) mà không gửi request sang service lỗi.
  * **Trạng thái Half-Open (Nửa đóng nửa hở):** Sau một khoảng thời gian chờ, breaker cho phép một vài request đi qua để thử xem service đã hồi phục chưa. Nếu thành công, mạch đóng lại; nếu thất bại, mạch lại mở ra.
* **Vị trí trong Code:** [resilient-http-client.ts](file:///c:/Users/Ngo%20Minh%20Tri/workspace/uit/microservices/luyen-thi-lai-xe-microservices/packages/common/src/http/resilient-http-client.ts) (sử dụng biến trạng thái `circuits` dạng Map để lưu và kiểm tra trạng thái circuit breaker của từng dependency).

---

Tài liệu này được biên soạn đầy đủ và lưu trực tiếp trong thư mục tài liệu hướng dẫn của dự án tại `guides/docs/SRS-ASR-MAPPING-SUMMARY.md` để bạn có thể sử dụng làm tài liệu thuyết minh đồ án hoặc slide báo cáo với thầy phản biện!
