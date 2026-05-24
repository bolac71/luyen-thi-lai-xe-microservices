# Phase 6.1-6.2 - Logging, ELK và Correlation ID

Tài liệu này mô tả phần logging tập trung bằng ELK cho Phase 6.1 và truy vết request bằng Correlation ID cho Phase 6.2.

## Mục tiêu

- Các NestJS service dùng `AppLoggerModule` từ `@repo/common`.
- Log được enrich tối thiểu bằng `serviceName`, `environment`, `logType`, `timestamp`.
- Access log có thêm `correlationId`, `method`, `path`, `statusCode`, `latencyMs`, `actorId`, `ipAddress`, `userAgent`.
- Logstash nhận log qua HTTP `5044`, parse JSON và đẩy vào Elasticsearch index `microservices-logs-*`.
- Kibana dùng để tìm log theo service, level, `logType` hoặc `correlationId`.
- Kong nhận hoặc tự tạo `x-correlation-id`, forward xuống service và echo lại response.
- Correlation ID được giữ trong request context bằng `AsyncLocalStorage`, tự đi vào application log và RabbitMQ event payload.

## Thành phần

| Thành phần | Vai trò | URL local |
| --- | --- | --- |
| `AppLoggerModule` | Winston logger chung cho service | N/A |
| `Logstash` | Nhận JSON log qua HTTP và forward sang Elasticsearch | `http://localhost:5044` |
| `Elasticsearch` | Lưu log tập trung | `http://localhost:9200` |
| `Kibana` | Truy vấn và visualize log | `http://localhost:5601` |

## Luồng log

```text
NestJS service
  -> AppLoggerModule / Winston HTTP transport
  -> Logstash HTTP input :5044
  -> Elasticsearch index microservices-logs-YYYY.MM.dd
  -> Kibana Discover / Dashboard
```

## Luồng Correlation ID

```text
Client
  -> Kong correlation-id plugin
  -> x-correlation-id header
  -> CorrelationIdMiddleware / CorrelationIdInterceptor
  -> AsyncLocalStorage context
  -> application log + access log + audit event
  -> RabbitMQ event payload correlationId
  -> downstream service log cùng correlationId
```

Quy tắc:

- Nếu client gửi `x-correlation-id`, hệ thống giữ nguyên ID đó.
- Nếu client không gửi, Kong tạo ID mới và service fallback tự tạo ID nếu request không đi qua Kong.
- Response luôn có header `x-correlation-id`.
- Log trong cùng HTTP request hoặc message handler có cùng `correlationId`.
- Event publish qua RabbitMQ được enrich thêm field `correlationId` để service nhận có thể tiếp tục trace.

## Chạy local

Hybrid mode:

```powershell
npm.cmd run infra:up
npm.cmd run dev
```

`scripts/dev.ts` tự set:

```text
LOGSTASH_HOST=127.0.0.1
LOGSTASH_PORT=5044
NODE_ENV=development-local
```

Full Docker mode:

```powershell
npm.cmd run docker:up
```

Các service chạy trong Docker dùng `LOGSTASH_HOST=logstash`.

## Verify nhanh

Gửi một request qua Kong:

```powershell
$cid = "demo-phase-6-1-" + [guid]::NewGuid().ToString()
curl.exe -H "x-correlation-id: $cid" http://localhost:8000/user-service/health/live
```

Kiểm tra Elasticsearch:

```powershell
curl.exe "http://localhost:9200/microservices-logs-*/_search?q=correlationId:$cid&pretty"
```

Mở Kibana:

```text
http://localhost:5601
```

Tạo data view:

```text
microservices-logs-*
```

Trường thời gian:

```text
@timestamp
```

## Query hữu ích trong Kibana

```text
serviceName: "user-service"
```

```text
logType: "access" and statusCode >= 500
```

```text
correlationId: "demo-phase-6-1-*"
```

## Verify Phase 6.2

Case 1: Client tự truyền Correlation ID.

```powershell
$cid = "phase-6-2-" + [guid]::NewGuid().ToString()
curl.exe -i -H "x-correlation-id: $cid" http://localhost:8000/user-service/health/live
curl.exe "http://localhost:9200/microservices-logs-*/_search?q=correlationId:$cid&pretty"
```

Kỳ vọng:

- Response header có `x-correlation-id` đúng bằng `$cid`.
- Elasticsearch có access log với `correlationId=$cid`.

Case 2: Client không truyền Correlation ID.

```powershell
curl.exe -i http://localhost:8000/user-service/health/live
```

Kỳ vọng:

- Kong hoặc service tự tạo `x-correlation-id`.
- Dùng giá trị header này để query trong Kibana/Elasticsearch.

Case 3: Request tạo event RabbitMQ.

```powershell
# Gọi một API có publish domain event, ví dụ luồng identity/user/course tùy dữ liệu local.
# Sau đó query cùng correlationId trong log của service publish và service consume.
```

Kỳ vọng:

- Service publish log có `correlationId`.
- Service consume message cũng log cùng `correlationId`.

## Deploy staging/production

`docker-compose.deploy.yml` đã có:

- `elasticsearch`
- `logstash`
- `kibana`
- volume `elasticsearch_data`
- biến logging dùng chung cho service: `LOGSTASH_HOST=logstash`, `LOGSTASH_PORT=5044`, `LOG_CONSOLE_FORMAT=json`

Các file env mẫu có thể chỉnh port public:

```text
ELASTICSEARCH_PORT=9200
LOGSTASH_HOST_PORT=5044
KIBANA_PORT=5601
ES_JAVA_OPTS=-Xms512m -Xmx512m
```

Trong production thật, nên giới hạn public access tới Elasticsearch, Logstash và Kibana bằng firewall/VPN/reverse proxy có auth.

## Checklist hoàn thành Phase 6.1

- `npm run infra:up` hoặc `npm run docker:up` khởi động được Elasticsearch, Logstash, Kibana.
- Service gửi log JSON sang Logstash.
- Elasticsearch có index `microservices-logs-*`.
- Kibana query được log theo `serviceName`.
- Access log query được theo `correlationId`.
- Deploy compose có ELK và app services có biến `LOGSTASH_HOST`.

## Checklist hoàn thành Phase 6.2

- Kong config có `correlation-id` plugin dùng header `x-correlation-id`.
- CORS cho phép request header và expose response header `x-correlation-id`.
- `CorrelationIdMiddleware` gắn ID vào HTTP request/response.
- `CorrelationIdInterceptor` tạo context cho HTTP và RabbitMQ message handlers.
- `AppLoggerModule` tự enrich application log bằng correlation ID hiện tại.
- RabbitMQ event publisher enrich payload bằng `correlationId`.
- Audit event fallback lấy correlation ID từ request context.
