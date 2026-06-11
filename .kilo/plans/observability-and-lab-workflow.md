# Comprehensive Execution Plan: Observability + Lab Test Workflow

## Status: PLANNING — NOT STARTED

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Phase 1: Observability (Metrics, Logging, Tracing)](#phase-1-observability)
4. [Phase 2: Customer Lab Test Registration Flow](#phase-2-customer-registration)
5. [Phase 3: Lab Test Tracking](#phase-3-lab-test-tracking)
6. [Phase 4: Admin Laboran Assignment](#phase-4-admin-laboran-assignment)
7. [Phase 5: Draft Report Generation + Document Integration](#phase-5-draft-report)
8. [Phase 6: Frontend (cakramerp-app)](#phase-6-frontend)
9. [Database Migrations Summary](#7-database-migrations)
10. [Testing Strategy](#8-testing-strategy)
11. [Deployment & Rollout](#9-deployment)

---

## 1. Executive Summary

This plan covers **5 workstreams** across **3 repositories**:

| Workstream | Repositories | Effort |
|---|---|---|
| **Observability** | cakramerp-service, cakramerp-document | ~3 days |
| **Customer Lab Registration** | cakramerp-service, cakramerp-app | ~4 days |
| **Lab Test Tracking** | cakramerp-service, cakramerp-app | ~3 days |
| **Admin Laboran Assignment** | cakramerp-service, cakramerp-app | ~2 days |
| **Draft Report + Doc Integration** | cakramerp-service, cakramerp-document, cakramerp-app | ~5 days |

**Total estimated effort: ~17 days** (phased, some parallelizable)

---

## 2. Architecture Overview

### Current State

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   cakramerp-app     │────▶│   cakramerp-service  │────▶│  cakramerp-document │
│   (React/TanStack)  │ REST│   (NestJS/TypeORM)   │Redis│  (Spring Boot/Jasper)│
│   Port 3000         │     │   Port 6505          │PubSub│  Port 8080          │
└─────────────────────┘     └──────────┬───────────┘     └─────────────────────┘
                                       │
                            ┌──────────┴───────────┐
                            │  PostgreSQL · Redis   │
                            │  MinIO · BullMQ       │
                            └──────────────────────┘
```

### Target State (after all phases)

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   cakramerp-app     │────▶│   cakramerp-service  │────▶│  cakramerp-document │
│   + Lab Portal      │ REST│   + Observability     │Redis│  + Actuator/Micrometer│
│   + Customer Track  │     │   + Customer Portal   │     │  + OTel traces       │
└─────────────────────┘     │   + Laboran Workflow  │     │  + Lab report templates│
                            └──────────┬───────────┘     └─────────────────────┘
                                       │
                            ┌──────────┴───────────┐
                            │  + Prometheus metrics  │
                            │  + Grafana dashboards  │
                            │  + Jaeger traces       │
                            └──────────────────────┘
```

---

## Phase 1: Observability (Metrics, Logging, Tracing)

### 1A. cakramerp-service — Enhance Telemetry

#### 1A.1 Replace deprecated Jaeger exporter with OTLP

**File:** `src/telemetry/telemetry.service.ts`

**Changes:**
- Replace `@opentelemetry/exporter-jaeger` with `@opentelemetry/exporter-trace-otlp-http`
- Endpoint: `OTEL_EXPORTER_ENDPOINT` (default `http://localhost:4318/v1/traces`)
- Add resource detection: `envDetectorSync`, `hostDetectorSync`, `processDetectorSync`, `serviceNameDetectorSync`
- Add W3C TraceContext + Baggage propagator explicitly

**Dependencies to add:**
```json
"@opentelemetry/exporter-trace-otlp-http": "^0.218.0",
"@opentelemetry/resources": "^2.7.1",
"@opentelemetry/sdk-metrics": "^2.7.1",
"@opentelemetry/exporter-metrics-otlp-http": "^0.218.0"
```

**Dependencies to remove:**
```json
"@opentelemetry/exporter-jaeger": "^2.7.1"  // deprecated
```

#### 1A.2 Add Metrics (Prometheus-compatible)

**New file:** `src/telemetry/metrics.service.ts`

**Metrics to instrument:**
| Metric | Type | Labels |
|---|---|---|
| `http_server_duration` | Histogram | `method`, `route`, `status_code` |
| `http_server_request_total` | Counter | `method`, `route`, `status_code` |
| `db_query_duration` | Histogram | `operation`, `entity` |
| `queue_job_duration` | Histogram | `queue`, `status` |
| `queue_job_total` | Counter | `queue`, `status` |
| `document_generation_duration` | Histogram | `document_type`, `format`, `status` |
| `document_generation_total` | Counter | `document_type`, `status` |
| `auth_login_total` | Counter | `status` |
| `lab_testing_request_total` | Counter | `status` |

**Approach:** Use `@opentelemetry/sdk-metrics` with `PrometheusExporter` (port 9464) OR use NestJS interceptors with manual counters. The OTel approach is preferred for unified pipeline.

**New file:** `src/telemetry/metrics.interceptor.ts`
- HTTP request duration interceptor using OTel `MeterProvider`
- Auto-instruments all routes with method/route/status labels

#### 1A.3 Add Log Correlation (Trace Context in Logs)

**File:** `src/app.module.ts` (LoggerModule config)

**Changes:**
- Create a pino plugin/transport that injects `trace_id` and `span_id` from the active OTel context into every log line
- Use `@opentelemetry/api` `trace.getActiveSpan()?.spanContext()` in a pino mixin

**New file:** `src/telemetry/trace-context.mixin.ts`
```typescript
// Pino mixin that adds trace_id, span_id to every log entry
export function traceContextMixin() {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  return { trace_id: ctx.traceId, span_id: ctx.spanId };
}
```

**Update:** `src/app.module.ts` — add `mixin: traceContextMixin` to LoggerModule config.

#### 1A.4 Add Custom Spans for Business Operations

**New file:** `src/telemetry/span.decorator.ts`
- `@WithSpan(name, attributes?)` method decorator using OTel API
- Auto-creates child span for the decorated method

**Apply to key services:**
- `AuthService.login()` / `register()`
- `TestingRequestService.create()` / `submit()` / `approve()`
- `TestResultService.create()` / `submit()` / `approve()`
- `DailyReportService.create()` / `submit()`
- `DocumentGenerationPublisherService.requestDocumentGeneration()`

#### 1A.5 Add /metrics Endpoint

**New file:** `src/modules/shared/infrastructure/health/metrics.controller.ts`

```typescript
@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics() {
    // Return Prometheus-format metrics from OTel MetricReader
  }
}
```

#### 1A.6 Update Health Endpoints with More Checks

**File:** `src/modules/shared/infrastructure/health/health.controller.ts`

Add checks for:
- BullMQ queue connectivity (via existing `QueueHealthService`)
- MinIO connectivity (ping MinIO)
- Memory/disk thresholds

#### 1A.7 Environment Variables

Add to `.env.example`:
```
OTEL_ENABLED=true
OTEL_EXPORTER_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=cakramerp-service
OTEL_METRICS_PORT=9464
```

---

### 1B. cakramerp-document — Add Actuator + Micrometer + OTel

#### 1B.1 Add Dependencies

**File:** `build.gradle`

```groovy
// Add:
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-registry-prometheus'
implementation 'io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter:2.12.0'
```

#### 1B.2 Replace Hand-Rolled Health/Metrics with Actuator

**Remove:** `HealthController.java`, `MetricsController.java` (hand-rolled)

**Configure in `application.properties`:**
```properties
# Actuator
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=always
management.health.redis.enabled=true
management.health.db.enabled=true

# Prometheus
management.prometheus.metrics.export.enabled=true

# Custom metrics prefix
management.metrics.tags.application=cakramerp-document
```

**Health groups:**
```properties
management.endpoint.health.group.liveness.include=ping,diskSpace
management.endpoint.health.group.readiness.include=db,redis,minio
```

#### 1B.3 Add Custom Metrics

**New file:** `src/main/java/company/menma/cakramerp_report/infrastructure/metrics/DocumentMetricsService.java`

```java
@Component
public class DocumentMetricsService {
    private final Counter generationCounter;
    private final Timer generationTimer;
    private final Counter errorCounter;

    public DocumentMetricsService(MeterRegistry registry) {
        generationCounter = Counter.builder("document.generation.total")
            .tag("type", "").tag("format", "").register(registry);
        generationTimer = Timer.builder("document.generation.duration")
            .register(registry);
        errorCounter = Counter.builder("document.generation.errors")
            .register(registry);
    }
}
```

**Instrument:** `DocumentGenerationService.java` — wrap generation in timer, increment counters.

#### 1B.4 Add OpenTelemetry Tracing

**File:** `application.properties`

```properties
# OTel
otel.service.name=cakramerp-document
otel.exporter.otlp.endpoint=http://localhost:4318
otel.traces.sampler=always_on
```

**Dependency:** `opentelemetry-spring-boot-starter` auto-configures OTel with Spring Boot.

#### 1B.5 Add Custom Spans

**Instrument:**
- `DocumentGenerationService.generateDocument()` — span with documentType, entityId attributes
- `JasperReportService.export()` — span with format, template attributes
- `DocumentRequestListener.onMessage()` — span with requestId attribute
- `MinioService.uploadFile()` — span with bucket, objectName attributes

#### 1B.6 Add Log Correlation

Spring Boot + OTel starter auto-injects `trace_id` and `span_id` into MDC for Logback/Log4j2.

**Add:** Logback configuration for JSON structured logging in production.

**New file:** `src/main/resources/logback-spring.xml`
```xml
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>
    <springProfile name="production">
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>
</configuration>
```

**Dependency:** `net.logstash.logback:logstash-logback-encoder`

#### 1B.7 Docker Compose — Add Observability Stack

**Update:** `docker-compose.yml` (root level or per-service)

Add services:
```yaml
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - '16686:16686'  # UI
      - '4318:4318'    # OTLP HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: true

  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3001:3000'
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

**New file:** `prometheus.yml` — scrape configs for cakramerp-service:9464 and cakramerp-document:8080/actuator/prometheus.

---

## Phase 2: Customer Lab Test Registration Flow

### Overview

Customers need a way to submit lab test requests. Currently the `TestingRequest` entity exists but is admin-only. We need:
1. A **customer portal** concept — customers can log in and submit requests
2. Customer-specific endpoints (separate from admin endpoints)
3. A registration/sign-up flow for customers

### 2A. Customer Portal Authentication

#### 2A.1 Add Customer User Type

The existing `users` table has roles. We need a `customer` role that maps to a `customer` record.

**Migration:** `20260607000001-add-customer-role-and-portal.ts`

```sql
-- Add customer portal fields to customers table
ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE customers ADD COLUMN portal_access BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN portal_registered_at TIMESTAMPTZ;

-- Create index
CREATE INDEX idx_customers_user_id ON customers(user_id);
```

**Domain entity update:** Add `userId`, `portalAccess`, `portalRegisteredAt` to `Customer` entity.

#### 2A.2 Customer Registration Endpoint

**New file:** `src/modules/customer/application/commands/register-customer.command.ts`

```typescript
export interface RegisterCustomerCommand {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
}
```

**New file:** `src/modules/customer/application/services/customer-portal.service.ts`

```typescript
@Injectable()
export class CustomerPortalService {
  // Register: create user + customer + assign 'customer' role
  // Login: standard JWT flow (existing auth)
  // Get profile: return customer data for logged-in customer
}
```

**New controller:** `src/modules/customer/infrastructure/http/controllers/customer-portal.controller.ts`

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/portal/register` | None | Customer self-registration |
| `POST` | `/portal/login` | None | Customer login (reuse auth service) |
| `GET` | `/portal/profile` | JWT + customer role | Get customer profile |
| `PUT` | `/portal/profile` | JWT + customer role | Update customer profile |

#### 2A.3 Customer Lab Test Submission

**New controller:** `src/modules/customer/infrastructure/http/controllers/customer-lab.controller.ts`

| Method | Route | Auth | Permission | Description |
|---|---|---|---|---|
| `GET` | `/portal/lab/testing-services` | JWT (customer) | — | Browse available testing services |
| `POST` | `/portal/lab/testing-requests` | JWT (customer) | — | Submit a new testing request |
| `GET` | `/portal/lab/testing-requests` | JWT (customer) | — | List own testing requests |
| `GET` | `/portal/lab/testing-requests/:id` | JWT (customer) | — | View own testing request detail |
| `PATCH` | `/portal/lab/testing-requests/:id/cancel` | JWT (customer) | — | Cancel own draft/submitted request |

**Business rules:**
- Customers can only see their own requests (filter by `customerId` from JWT)
- Status flow for customer-submitted: `draft` → `submitted` (auto-submit on creation)
- Customers cannot approve/reject — only admin can
- `customerId` is resolved from `req.user.id → customer.userId` lookup

#### 2A.4 Update TestingRequest Entity

**Add fields to `TestingRequest` domain entity:**
```typescript
submittedBy: 'customer' | 'admin';  // Who submitted
customerUserId?: string;             // Link to user account
projectAddress?: string;             // Delivery/collection address
preferredScheduleDate?: Date;        // Customer's preferred date
priority: 'normal' | 'urgent';       // Priority level
```

**Migration:** `20260607000002-add-testing-request-customer-fields.ts`

```sql
ALTER TABLE testing_requests ADD COLUMN submitted_by VARCHAR(20) DEFAULT 'admin';
ALTER TABLE testing_requests ADD COLUMN customer_user_id UUID REFERENCES users(id);
ALTER TABLE testing_requests ADD COLUMN project_address TEXT;
ALTER TABLE testing_requests ADD COLUMN preferred_schedule_date DATE;
ALTER TABLE testing_requests ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
```

---

## Phase 3: Lab Test Tracking

### 3A. Customer Tracking Dashboard

#### 3A.1 Status Tracking Endpoint

**New file:** `src/modules/customer/infrastructure/http/controllers/customer-lab.controller.ts` (extend)

| Method | Route | Description |
|---|---|---|
| `GET` | `/portal/lab/testing-requests/:id/track` | Full tracking timeline |

**Response shape:**
```json
{
  "requestNumber": "REQ-2026-00001",
  "status": "processing",
  "customerName": "PT. ABC",
  "projectName": "Soil Testing",
  "timeline": [
    { "status": "submitted", "timestamp": "2026-06-01T10:00:00Z", "by": "Customer" },
    { "status": "approved", "timestamp": "2026-06-01T14:00:00Z", "by": "Admin User" },
    { "status": "assigned", "timestamp": "2026-06-02T09:00:00Z", "by": "Admin User", "detail": "Assigned to Laboran: Budi" },
    { "status": "sampling", "timestamp": "2026-06-03T08:00:00Z", "by": "Budi (Laboran)" },
    { "status": "testing", "timestamp": "2026-06-04T10:00:00Z", "by": "Budi (Laboran)" },
    { "status": "report_draft", "timestamp": "2026-06-05T16:00:00Z", "by": "Budi (Laboran)" }
  ],
  "samples": [
    { "code": "SPL-2026-00001", "status": "completed", "type": "Soil" },
    { "code": "SPL-2026-00002", "status": "processing", "type": "Water" }
  ],
  "documents": [
    { "type": "draft_report", "status": "completed", "downloadUrl": "..." }
  ]
}
```

#### 3A.2 Activity Log / Audit Trail

**New entity:** `LabActivityLog`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `testing_request_id` | UUID | FK to testing_requests |
| `action` | varchar(50) | e.g. `submitted`, `approved`, `assigned`, `sample_received`, etc. |
| `performed_by` | UUID | User who performed the action |
| `performed_by_name` | varchar(255) | Denormalized name |
| `performed_by_role` | varchar(50) | `customer`, `admin`, `laboran` |
| `details` | JSONB | Additional context |
| `created_at` | timestamptz | When |

**Migration:** `20260607000003-create-lab-activity-log.ts`

```sql
CREATE TABLE lab_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testing_request_id UUID NOT NULL REFERENCES testing_requests(id),
    action VARCHAR(50) NOT NULL,
    performed_by UUID NOT NULL,
    performed_by_name VARCHAR(255),
    performed_by_role VARCHAR(50),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lab_activity_logs_request ON lab_activity_logs(testing_request_id);
CREATE INDEX idx_lab_activity_logs_created ON lab_activity_logs(created_at);
```

**Integration:** Every status change in `TestingRequestService`, `SampleService`, `TestResultService`, `DailyReportService` writes a `LabActivityLog` entry.

#### 3A.3 Customer Notification (BullMQ)

**New queue:** `lab-notifications` in `src/queues/queue.module.ts`

**New processor:** `src/queues/lab-notification.processor.ts`

Events that trigger notifications:
- Testing request approved/rejected
- Sample received
- Test results available
- Draft report generated
- Report approved

**Channel:** Email (via existing `NotificationProcessor`) + in-app notification (new `LabNotification` entity for bell icon).

---

## Phase 4: Admin Laboran Assignment

### 4A. Laboran Role Setup

#### 4A.1 Seed Migration

**Migration:** `20260607000004-seed-laboran-role-permissions.ts`

```typescript
// Insert role
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES (gen_random_uuid(), 'laboran', 'Laboratory technician - records and processes lab tests', NOW(), NOW());

// Insert permissions
INSERT INTO permissions (id, name, resource, action, created_at, updated_at) VALUES
  (gen_random_uuid(), 'testing-requests:read', 'testing-requests', 'read', NOW(), NOW()),
  (gen_random_uuid(), 'samples:read', 'samples', 'read', NOW(), NOW()),
  (gen_random_uuid(), 'samples:create', 'samples', 'create', NOW(), NOW()),
  (gen_random_uuid(), 'samples:update', 'samples', 'update', NOW(), NOW()),
  (gen_random_uuid(), 'test-results:read', 'test-results', 'read', NOW(), NOW()),
  (gen_random_uuid(), 'test-results:create', 'test-results', 'create', NOW(), NOW()),
  (gen_random_uuid(), 'test-results:update', 'test-results', 'update', NOW(), NOW()),
  (gen_random_uuid(), 'test-results:submit', 'test-results', 'submit', NOW(), NOW()),
  (gen_random_uuid(), 'daily-reports:read', 'daily-reports', 'read', NOW(), NOW()),
  (gen_random_uuid(), 'daily-reports:create', 'daily-reports', 'create', NOW(), NOW()),
  (gen_random_uuid(), 'daily-reports:submit', 'daily-reports', 'submit', NOW(), NOW()),
  (gen_random_uuid(), 'schedules:read', 'schedules', 'read', NOW(), NOW()),
  (gen_random_uuid(), 'schedules:update', 'schedules', 'update', NOW(), NOW());

-- Link permissions to laboran role via role_permissions
```

#### 4A.2 Laboran Assignment Entity

**New fields on `TestingRequest`:**

```typescript
assignedLaboranId?: string;      // UUID of user with laboran role
assignedLaboranName?: string;    // Denormalized name
assignedAt?: Date;               // When assigned
assignmentNotes?: string;        // Admin notes for the laboran
```

**Migration:** `20260607000005-add-laboran-assignment-fields.ts`

```sql
ALTER TABLE testing_requests ADD COLUMN assigned_laboran_id UUID REFERENCES users(id);
ALTER TABLE testing_requests ADD COLUMN assigned_laboran_name VARCHAR(255);
ALTER TABLE testing_requests ADD COLUMN assigned_at TIMESTAMPTZ;
ALTER TABLE testing_requests ADD COLUMN assignment_notes TEXT;
CREATE INDEX idx_testing_requests_laboran ON testing_requests(assigned_laboran_id);
```

#### 4A.3 Admin Assignment Endpoint

**Update:** `TestingRequestController`

| Method | Route | Permission | Description |
|---|---|---|---|
| `PATCH` | `/laboratory/testing-requests/:id/assign` | `testing-requests:assign` | Assign laboran to testing request |

**DTO:**
```typescript
export class AssignLaboranDto {
  @IsUUID() laboranId: string;
  @IsOptional() @IsString() notes?: string;
}
```

**Business logic in `TestingRequestService.assignLaboran()`:**
1. Validate testing request is in `approved` status
2. Validate `laboranId` has `laboran` role
3. Set `assignedLaboranId`, `assignedLaboranName`, `assignedAt`
4. Write `LabActivityLog` entry (action: `assigned`)
5. Trigger notification to laboran (BullMQ)

#### 4A.4 Laboran Dashboard View

**New endpoint for laboran:**

| Method | Route | Permission | Description |
|---|---|---|---|
| `GET` | `/laboratory/my/assignments` | `testing-requests:read` | List requests assigned to current laboran |
| `GET` | `/laboratory/my/assignments/:id` | `testing-requests:read` | Detail of assigned request |

**Filter:** `WHERE assigned_laboran_id = req.user.id`

#### 4A.5 Update Permission Constants (Frontend)

**File:** `src/lib/permissions.ts`

Add laboratory permission group:
```typescript
LABORATORY: {
  TESTING_REQUESTS_READ: 'testing-requests:read',
  TESTING_REQUESTS_CREATE: 'testing-requests:create',
  TESTING_REQUESTS_UPDATE: 'testing-requests:update',
  TESTING_REQUESTS_DELETE: 'testing-requests:delete',
  TESTING_REQUESTS_ASSIGN: 'testing-requests:assign',
  TESTING_REQUESTS_APPROVE: 'testing-requests:approve',
  SAMPLES_READ: 'samples:read',
  SAMPLES_CREATE: 'samples:create',
  SAMPLES_UPDATE: 'samples:update',
  TEST_RESULTS_READ: 'test-results:read',
  TEST_RESULTS_CREATE: 'test-results:create',
  TEST_RESULTS_UPDATE: 'test-results:update',
  TEST_RESULTS_SUBMIT: 'test-results:submit',
  TEST_RESULTS_APPROVE: 'test-results:approve',
  DAILY_REPORTS_READ: 'daily-reports:read',
  DAILY_REPORTS_CREATE: 'daily-reports:create',
  DAILY_REPORTS_SUBMIT: 'daily-reports:submit',
  DAILY_REPORTS_APPROVE: 'daily-reports:approve',
  SCHEDULES_READ: 'schedules:read',
  SCHEDULES_UPDATE: 'schedules:update',
  CONTRACTS_READ: 'contracts:read',
  CONTRACTS_CREATE: 'contracts:create',
  CONTRACTS_UPDATE: 'contracts:update',
  LABORATORIES_READ: 'laboratories:read',
  TESTING_SERVICES_READ: 'testing-services:read',
  SAMPLE_TYPES_READ: 'sample-types:read',
},
```

---

## Phase 5: Draft Report Generation + Document Integration

### Overview

The flow:
1. Laboran records test results → submits
2. Laboran generates a **draft report** (aggregates test results for a testing request)
3. Draft report is sent to `cakramerp-document` via Redis for PDF generation
4. Generated PDF is stored in MinIO
5. Customer can download the draft report
6. Admin can approve the report → becomes final

### 5A. New Document Type: Lab Draft Report

#### 5A.1 Update Document Constants

**File:** `src/modules/shared/infrastructure/document-generation/document-generation.constants.ts`

Add to `DOCUMENT_TYPES`:
```typescript
LAB_DRAFT_REPORT: 'lab_draft_report',
LAB_FINAL_REPORT: 'lab_final_report',
```

#### 5A.2 Update cakramerp-document Template

**New file:** `src/main/resources/reports/laboratory/lab-draft-report.jrxml`

This JasperReports template should include:
- Company header/logo
- Report number, date
- Customer info (name, project, address)
- Testing request reference
- Table of samples with test results
- Summary/conclusion section
- Watermark: "DRAFT"
- Signature blocks (laboran, reviewer, approver)

#### 5A.3 Update JasperReportService Template Resolution

**File:** `cakramerp-document/src/main/java/company/menma/cakramerp_report/application/JasperReportService.java`

Fix the template path resolution to handle subdirectory structure:
```java
// Current: /reports/{documentType}.jrxml (broken — templates are in subdirs)
// Fix: /reports/{category}/{documentType}.jrxml
private String resolveTemplatePath(String documentType) {
    Map<String, String> templatePaths = Map.of(
        "lab_draft_report", "laboratory/lab-draft-report",
        "lab_final_report", "laboratory/lab-final-report",
        "purchase_order", "purchasing/purchase-order",
        // ... etc
    );
    return "/reports/" + templatePaths.getOrDefault(documentType, documentType) + ".jrxml";
}
```

### 5B. Draft Report Service (cakramerp-service)

#### 5B.1 New Service: LabReportService

**New file:** `src/modules/laboratory/application/services/lab-report.service.ts`

```typescript
@Injectable()
export class LabReportService {
  constructor(
    @Inject(TESTING_REQUEST_REPOSITORY) private requestRepo,
    @Inject(SAMPLE_REPOSITORY) private sampleRepo,
    @Inject(TEST_RESULT_REPOSITORY) private resultRepo,
    @Inject(DAILY_REPORT_REPOSITORY) private reportRepo,
    private docHelper: DocumentGenerationHelper,
    private activityLogService: LabActivityLogService,
  ) {}

  async generateDraftReport(requestId: string, userId: string): Promise<DailyReport> {
    // 1. Fetch testing request
    // 2. Fetch all samples for this request
    // 3. Fetch all approved test results for these samples
    // 4. Create DailyReport with lines from test results
    // 5. Trigger document generation via DocumentGenerationHelper
    // 6. Write activity log
    // 7. Return the created DailyReport
  }

  async finalizeReport(reportId: string, userId: string): Promise<DailyReport> {
    // 1. Validate report is in 'approved' status
    // 2. Trigger final report document generation (without DRAFT watermark)
    // 3. Update testing request status to 'completed'
    // 4. Write activity log
    // 5. Notify customer
  }
}
```

#### 5B.2 Update DailyReportService

**File:** `src/modules/laboratory/application/services/daily-report.service.ts`

Add method:
```typescript
async generateFromTestingRequest(requestId: string, userId: string): Promise<DailyReport> {
  // Delegates to LabReportService
}
```

#### 5B.3 New Endpoint

**File:** `src/modules/laboratory/infrastructure/http/controllers/daily-report.controller.ts`

| Method | Route | Permission | Description |
|---|---|---|---|
| `POST` | `/laboratory/testing-requests/:id/generate-report` | `daily-reports:create` | Generate draft report from testing request |
| `GET` | `/laboratory/daily-reports/:id/download` | `daily-reports:read` | Get presigned URL for report PDF |

#### 5B.4 Update DocumentGenerationPublisherService

**File:** `src/modules/shared/infrastructure/document-generation/document-generation-publisher.service.ts`

Add `watermark` parameter support:
```typescript
interface DocumentGenerationRequest {
  // ... existing fields
  watermark?: string; // 'DRAFT', 'FINAL', etc.
}
```

This gets passed through Redis to cakramerp-document.

#### 5B.5 Update cakramerp-document Request Handler

**File:** `cakramerp-document/src/main/java/company/menma/cakramerp_report/domain/DocumentGenerationRequest.java`

Add `watermark` field to the request record.

**File:** `cakramerp-document/src/main/java/company/menma/cakramerp_report/application/JasperReportService.java`

Apply watermark to JasperPrint before export:
```java
if (request.watermark() != null && !request.watermark().isEmpty()) {
    // Add watermark text element to every page band
}
```

### 5C. Customer Report Download

**New endpoint in customer portal controller:**

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/portal/lab/testing-requests/:id/reports` | JWT (customer) | List reports for own request |
| `GET` | `/portal/lab/daily-reports/:id/download` | JWT (customer) | Download report PDF |

**Security:** Verify `customerId` matches the logged-in customer's linked customer record.

---

## Phase 6: Frontend (cakramerp-app)

### 6A. Customer Portal Routes

**New route group:** `src/routes/portal/`

```
src/routes/
├── portal.tsx                    # Portal layout (public-ish, lighter sidebar)
├── portal/
│   ├── index.tsx                 # Portal dashboard
│   ├── register.tsx              # Customer registration
│   ├── login.tsx                 # Customer login (reuse existing login pattern?)
│   ├── lab/
│   │   ├── index.tsx             # Browse testing services
│   │   ├── new-request.tsx       # Submit new testing request
│   │   ├── requests.tsx          # My testing requests list
│   │   ├── requests.$id.tsx      # Request detail + tracking timeline
│   │   └── requests.$id.track.tsx # Full tracking page
│   └── profile.tsx               # Customer profile
```

### 6B. Admin Lab Routes (Updates)

**Update existing:** `src/routes/_app/laboratory/testing-requests_.$id.tsx`

Add:
- "Assign Laboran" button (for admin) → opens modal with laboran user picker
- Assignment info display (laboran name, assigned date)
- "Generate Draft Report" button (when all samples completed + results approved)

**New route:** `src/routes/_app/laboratory/testing-requests_.$id.assign.tsx`
- Modal/page for assigning laboran
- Uses `AsyncCombobox` to fetch users with `laboran` role

### 6C. Laboran Dashboard

**New route:** `src/routes/_app/laboratory/my-assignments.tsx`

- Lists testing requests assigned to the current user (laboran)
- Quick actions: View details, Record samples, Enter test results

**New route:** `src/routes/_app/laboratory/my-assignments.$id.tsx`

- Detail view of assigned testing request
- Tabs: Samples | Test Results | Schedule | Report
- "Record Sample" button → inline form
- "Enter Test Result" button → inline form
- "Generate Draft Report" button (when all results submitted)

### 6D. Tracking Timeline Component

**New component:** `src/components/laboratory/TrackingTimeline.tsx`

Visual timeline showing:
- Status progression with icons
- Timestamps and actor for each step
- Current status highlighted
- Estimated next steps

### 6E. URL Client Updates

**File:** `src/lib/url-client.ts`

Add to `API_URLS`:
```typescript
// Customer portal
portal: {
  register: '/portal/register',
  login: '/portal/login',
  profile: '/portal/profile',
  labRequests: '/portal/lab/testing-requests',
  labRequestDetail: (id: string) => `/portal/lab/testing-requests/${id}`,
  labRequestTrack: (id: string) => `/portal/lab/testing-requests/${id}/track`,
  labTestingServices: '/portal/lab/testing-services',
  labReports: (requestId: string) => `/portal/lab/testing-requests/${requestId}/reports`,
  labReportDownload: (id: string) => `/portal/lab/daily-reports/${id}/download`,
},
// Lab admin extensions
laboratory: {
  // ... existing
  assignLaboran: (id: string) => `/laboratory/testing-requests/${id}/assign`,
  generateReport: (id: string) => `/laboratory/testing-requests/${id}/generate-report`,
  myAssignments: '/laboratory/my/assignments',
  myAssignmentDetail: (id: string) => `/laboratory/my/assignments/${id}`,
},
```

---

## 7. Database Migrations Summary

| # | Migration File | Description |
|---|---|---|
| 1 | `20260607000001-add-customer-role-and-portal.ts` | Add `user_id`, `portal_access`, `portal_registered_at` to customers |
| 2 | `20260607000002-add-testing-request-customer-fields.ts` | Add `submitted_by`, `customer_user_id`, `project_address`, `preferred_schedule_date`, `priority` to testing_requests |
| 3 | `20260607000003-create-lab-activity-log.ts` | Create `lab_activity_logs` table |
| 4 | `20260607000004-seed-laboran-role-permissions.ts` | Seed `laboran` role + 13 permissions |
| 5 | `20260607000005-add-laboran-assignment-fields.ts` | Add `assigned_laboran_id`, `assigned_laboran_name`, `assigned_at`, `assignment_notes` to testing_requests |
| 6 | `20260607000006-add-testing-request-status-updates.ts` | Add new statuses: `assigned`, `sampling`, `testing`, `report_draft`, `completed` |

**Updated status flow for TestingRequest:**
```
draft → submitted → approved → assigned → sampling → testing → report_draft → completed
                  ↘ rejected                ↘ cancelled
```

---

## 8. Testing Strategy

### Unit Tests
- All new services: `CustomerPortalService`, `LabReportService`, `LabActivityLogService`
- Updated services: `TestingRequestService` (new methods: `assignLaboran`, `generateReport`)
- Document generation helper with watermark support

### Integration Tests
- Customer registration → login → submit request flow
- Admin approve → assign laboran → laboran records results → generate report flow
- Document generation with cakramerp-document (Redis pub/sub round-trip)
- Activity log entries for all status changes

### E2E Tests
- Full customer journey: register → submit → track → download report
- Full admin journey: receive request → approve → assign → review report
- Full laboran journey: view assignments → record samples → enter results → generate draft

---

## 9. Deployment & Rollout

### Phase 1 (Observability) — Deploy independently
- cakramerp-service: Update telemetry, add metrics endpoint
- cakramerp-document: Add Actuator + Micrometer
- Add Jaeger + Prometheus + Grafana to docker-compose
- **Zero breaking changes** — fully backward compatible

### Phase 2 (Customer Portal) — Deploy with migration
- Run migrations 1-2
- Seed `customer` role
- Deploy cakramerp-service with new portal endpoints
- Deploy cakramerp-app with portal routes
- **Breaking change**: None (new endpoints only)

### Phase 3 (Tracking) — Deploy with migration
- Run migration 3
- Deploy activity log integration
- Deploy tracking endpoints + UI
- **Breaking change**: None

### Phase 4 (Laboran) — Deploy with migration + seed
- Run migrations 4-5
- Seed laboran role and permissions
- Deploy assignment endpoints + UI
- **Breaking change**: None (new role + endpoints)

### Phase 5 (Reports) — Deploy with migration + template
- Run migration 6
- Deploy new JasperReports template
- Update document generation pipeline
- Deploy report generation endpoints + UI
- **Breaking change**: New status values in TestingRequest

---

## Implementation Priority Order

```
Week 1:  Phase 1 (Observability) — All repos, parallelizable
Week 2:  Phase 2 (Customer Registration) — Service + App
Week 3:  Phase 3 (Tracking) + Phase 4 (Laboran) — Overlapping
Week 4:  Phase 5 (Draft Reports + Doc Integration) — All 3 repos
Week 5:  Integration testing, bug fixes, polish
```

---

## Files to Create/Modify Summary

### cakramerp-service — New Files (~25)
```
src/telemetry/metrics.service.ts
src/telemetry/metrics.interceptor.ts
src/telemetry/trace-context.mixin.ts
src/telemetry/span.decorator.ts
src/modules/customer/application/commands/register-customer.command.ts
src/modules/customer/application/services/customer-portal.service.ts
src/modules/customer/infrastructure/http/controllers/customer-portal.controller.ts
src/modules/customer/infrastructure/http/controllers/customer-lab.controller.ts
src/modules/customer/infrastructure/http/dtos/customer-portal.dto.ts
src/modules/laboratory/application/services/lab-report.service.ts
src/modules/laboratory/application/services/lab-activity-log.service.ts
src/modules/laboratory/domain/entities/lab-activity-log.entity.ts
src/modules/laboratory/domain/repositories/lab-activity-log-repository.port.ts
src/modules/laboratory/infrastructure/entities/lab-activity-log-typeorm.entity.ts
src/modules/laboratory/infrastructure/repositories/lab-activity-log-typeorm.repository.ts
src/modules/laboratory/infrastructure/http/dtos/assign-laboran.dto.ts
src/modules/shared/infrastructure/health/metrics.controller.ts
src/queues/lab-notification.processor.ts
src/database/infrastructure/migrations/20260607000001-*.ts (6 migrations)
```

### cakramerp-service — Modify Files (~15)
```
src/telemetry/telemetry.service.ts (rewrite)
src/app.module.ts (add metrics interceptor, update logger)
src/modules/customer/domain/entities/customer.entity.ts (add portal fields)
src/modules/customer/infrastructure/entities/customer-typeorm.entity.ts (add columns)
src/modules/laboratory/domain/entities/testing-request.entity.ts (add assignment + customer fields)
src/modules/laboratory/infrastructure/entities/testing-request-typeorm.entity.ts (add columns)
src/modules/laboratory/application/services/testing-request.service.ts (add assignLaboran)
src/modules/laboratory/infrastructure/http/controllers/testing-request.controller.ts (add assign endpoint)
src/modules/laboratory/infrastructure/http/controllers/daily-report.controller.ts (add generate-report)
src/modules/laboratory/laboratory.module.ts (register new services)
src/modules/shared/infrastructure/document-generation/document-generation.constants.ts (add lab types)
src/modules/shared/infrastructure/document-generation/document-generation-publisher.service.ts (add watermark)
src/modules/shared/infrastructure/document-generation/document-generation.dto.ts (add watermark field)
src/queues/queue.module.ts (add lab-notifications queue)
src/lib/permissions.ts (add laboratory permissions)
```

### cakramerp-document — New Files (~3)
```
src/main/resources/reports/laboratory/lab-draft-report.jrxml
src/main/resources/reports/laboratory/lab-final-report.jrxml
src/main/java/.../infrastructure/metrics/DocumentMetricsService.java
src/main/resources/logback-spring.xml
```

### cakramerp-document — Modify Files (~6)
```
build.gradle (add actuator, micrometer, otel deps)
src/main/resources/application.properties (add actuator/otel config)
src/main/java/.../application/DocumentGenerationService.java (add metrics)
src/main/java/.../application/JasperReportService.java (fix template path, add watermark)
src/main/java/.../domain/DocumentGenerationRequest.java (add watermark field)
src/main/java/.../infrastructure/redis/DocumentRequestListener.java (pass watermark)
```

### cakramerp-app — New Files (~10)
```
src/routes/portal.tsx
src/routes/portal/index.tsx
src/routes/portal/register.tsx
src/routes/portal/login.tsx
src/routes/portal/lab/index.tsx
src/routes/portal/lab/new-request.tsx
src/routes/portal/lab/requests.tsx
src/routes/portal/lab/requests.$id.tsx
src/routes/portal/lab/requests.$id.track.tsx
src/routes/_app/laboratory/my-assignments.tsx
src/routes/_app/laboratory/my-assignments.$id.tsx
src/routes/_app/laboratory/testing-requests_.$id.assign.tsx
src/components/laboratory/TrackingTimeline.tsx
src/components/laboratory/AssignLaboranModal.tsx
```

### cakramerp-app — Modify Files (~5)
```
src/lib/permissions.ts (add laboratory permissions)
src/lib/url-client.ts (add portal + lab endpoints)
src/routes/_app/laboratory/testing-requests_.$id.tsx (add assign + report buttons)
src/routes/_app/laboratory/test-results_.$id.tsx (laboran view enhancements)
src/routes/_app.tsx (add portal navigation for customer role)
```
