# Task Tracker API (NestJS + TypeORM + SQL.js)

This service powers a lightweight task tracker with optimistic concurrency, filtering, and observability baked in. It is written in TypeScript on top of NestJS and TypeORM, packaged with pnpm, and secured via a simple bearer token flow suitable for internal tools or service-to-service calls.

---

## 1. Tech Stack & Operations

| Layer | Choice | Why it fits here |
|-------|--------|------------------|
| Runtime | **Node.js 20+** | Tight feedback loop, rich TypeScript ecosystem, effortless deployment to most environments. |
| Framework | **NestJS 11** | Opinionated modular structure, DI container, built-in testing utilities, and first-class TypeScript support. |
| Package manager | **pnpm** | Deterministic installs, workspace-friendly, faster and lower disk usage than npm/yarn. |
| Persistence | **TypeORM + SQL.js** | TypeORM gives entity/DTO parity and repository abstraction. SQL.js keeps persistence embeddable and avoids native sqlite builds in constrained CI or serverless setups, while still offering a file-backed mode. |
| Validation | **class-validator + ValidationPipe** | Declarative validation on DTOs, aligned with Nest pipes. |
| Config | **@nestjs/config + Joi** | Centralized configuration with schema validation for safe bootstrapping. |
| Logging & Errors | **Nest interceptors/filters + application/problem+json** | Single place for request logging and consistent error envelopes. |

### Installation & Local Dev

```bash
pnpm install
cp .env.example .env  # set API_TOKEN before starting

# Development server
pnpm start:dev

# Production build & run
pnpm build
pnpm start:prod
```

> **Tip:** The default database file is stored at `data/tasks.sqlite`. Set `DATABASE_PATH=:memory:` to keep everything in-memory (ideal for smoke tests or ephemeral environments).

### Tests

```bash
# Unit tests (services, pure logic)
pnpm test

# End-to-end tests (HTTP surface)
pnpm test:e2e

# Lint (auto-fixes enabled per config)
pnpm lint
```

---

## 2. Design Approach & Trade-offs

### Flow & Layering

1. **DTO ➜ Validation Pipe** – every request is transformed and validated before reaching controllers.
2. **Controller ➜ Service ➜ Repository** – controllers stay thin, delegating domain logic to the service and persistence to a repository abstraction (`TASK_REPOSITORY`).
3. **Repository ➜ TypeORM Query Builder** – filtering, pagination, and sorting handled in SQL for efficiency.
4. **Response Serialization** – responses mapped via `TaskResponseDto` for explicit API shapes and ISO-formatted timestamps.

### Best Practices Applied

- **Optimistic concurrency:** version field on tasks prevents lost updates.
- **Problem Details for errors:** consistent machine-readable envelopes via `application/problem+json`.
- **Dependency inversion:** repository interface allows swapping SQL.js for PostgreSQL or other stores with minimal code changes.
- **Global validation/logging:** configured once in `main.ts` so every route benefits automatically.

### Key Trade-offs

- **SQL.js vs Native SQLite:** avoids native builds (great for serverless/CI) but loads the DB into memory; large datasets may require migrating to a managed RDBMS.
- **Single token auth:** simple to operate, but not a replacement for full identity management when multi-user support is needed.
- **Strict DTO validation:** catches errors early but means payloads must stay in sync across clients; backward compatibility requires careful DTO evolution.

---

## 3. Authentication

- **Approach:** Custom bearer token guard (`ApiTokenGuard`) backed by `@nestjs/config`. Only write endpoints (`POST`, `PATCH`, `DELETE`) require the token.
- **Why:** Lightweight services often run behind gateways or Cron jobs—single secrets are easy to rotate and integrate (e.g., via environment variables, CI secrets).
- **Design Thinking:**
  - Guard throws `ProblemDetailsException` with specific `type` fields for better client automation.
  - Guard also surfaces misconfiguration (missing `API_TOKEN`) as a 401 problem response to fail fast.
- **Trade-offs:**
  - Not multi-tenant or per-user; token leakage grants full write access.
  - For public APIs you would swap in OAuth/JWT via Passport or a custom identity provider.

---

## 4. Error Handling

- **Mechanism:** Custom `ErrorFilter` + Nest global exception filters.
- **Approach:**
  - All thrown `ProblemDetailsException`s bubble up as RFC 7807 payloads.
  - Validation errors converted into structured `errors` dictionaries (`field -> messages`).
  - Unexpected errors are logged and returned with sanitized payloads so internals aren’t leaked.
- **Trade-offs:**
  - Single error format simplifies clients but forces them to understand problem+json.
  - Enriching errors with metadata needs curation to avoid bloated payloads.

---

## 5. Validation

- **Libraries:** `class-validator`, `class-transformer`, and Nest’s `ValidationPipe`.
- **Approach:** DTOs define constraints (lengths, enums, ISO dates). The global pipe handles transformation (e.g., string ➜ number) and whitelists properties.
- **Best Practices:**
  - Default fallbacks applied in the service to keep DTOs declarative.
  - Custom transformations normalize pagination params, tag arrays, and due dates.
- **Trade-offs:**
  - Strict whitelisting rejects unknown fields—clients must update promptly.
  - Class-based validators add runtime overhead versus schema-first libraries (e.g., Zod), but align cleanly with Nest pipes.

---

## 6. Persistence

- **Stack:** TypeORM repository pattern + SQL.js driver.
- **How it Works:**
  - `TaskEntity` models the table; `TypeOrmTaskRepository` encapsulates queries (filters, search, sort, pagination).
  - SQL.js keeps the database in memory with optional file persistence via `autoSave` callbacks controlled by configuration.
- **Design Thinking:**
  - Repository interface (`TaskRepository`) keeps the domain service storage-agnostic.
  - Tag lists stored as comma-separated values; compact storage that’s easy to migrate to a dedicated join table when needed.
- **Trade-offs:**
  - SQL.js is single-connection and not meant for heavy write contention.
  - Simple-array storage lacks advanced tag querying (no partial matches across arrays without scanning strings).

---

## 7. Observability

- **Approach:** `RequestLoggingInterceptor` logs every request with latency & status; global error filter logs stack traces for unhandled exceptions.
- **Libraries:** Nest interceptors/filters + built-in `Logger`.
- **Design Thinking:**
  - Centralized logging avoids scattered `console.log` usage and supports structured ingestion later.
  - Error filter emits sanitized messages while preserving stack traces for operators.
- **Trade-offs:**
  - No distributed tracing or metrics—sufficient for small services but would need OpenTelemetry or similar for larger deployments.
  - Logs are plaintext; structured JSON logging can be added if ingestion pipelines require it.

---

## Troubleshooting & Tips

- `API token is not configured` → ensure `.env` sets `API_TOKEN` before running the app or tests.
- `pnpm test:e2e` runs against an in-memory database; nothing persists between runs.
- To swap persistence (e.g., PostgreSQL), provide a new provider for `TASK_REPOSITORY` and adjust `TypeOrmModule.forRootAsync`; services/controllers stay untouched.

Happy shipping! 🚀

---

## 8. Testing Strategy

- **Approach:**
  - **Unit tests** (Jest) focus on the domain service with an in-memory repository (`src/tasks/tasks.service.spec.ts`). They assert default behaviors, optimistic concurrency, and transformation logic without touching HTTP or TypeORM internals.
  - **End-to-end tests** spin up the Nest application with the real modules and hit the HTTP endpoints via Supertest (`test/app.e2e-spec.ts`). We apply the same global pipes/filters/interceptors used in production to ensure realistic coverage.
- **Coverage:**
  - Unit suite covers the service’s happy path and conflict detection.
  - E2E suite covers auth failures, creation, listing, updating with concurrency check, and deletion. Together they exercise validation, error handling, and persistence wiring.
- **Trade-offs:**
  - No UI/consumer contract tests yet; clients should add their own integration checks.
  - SQL.js makes E2E fast but doesn’t simulate multi-connection contention—additional tests would be needed if/when we swap to Postgres.
  - Current coverage is targeted rather than exhaustive; decorators/utilities outside the hot path (e.g., logging interceptor) rely on linting and manual validation.

---

## 9. Future Enhancements

If time allowed, the next improvements would include:

1. **Security** – rotate to per-request JWTs or mTLS for stronger identity; add rate-limiting and audit logging; encrypt database at rest.
2. **Persistence** – migrate from SQL.js to Postgres via TypeORM URL configuration, add migration tooling, and introduce a real tag join-table for scalable querying.
3. **Observability** – integrate OpenTelemetry, structured JSON logging, and health/readiness probes for orchestration.
4. **Testing** – expand unit coverage (repository behaviors, guards), add contract tests (e.g., Pact) and mutation testing to harden validation paths.
5. **API Quality** – document with Swagger/OpenAPI via `@nestjs/swagger`, add versioning, and provide richer search filters (date ranges, multi-tag logic).
6. **Clean Code & DX** – enforce commit hooks (lint-staged), add CI pipeline, and provide seed scripts/fixtures for quicker QA setup.

These steps would make the service production-grade while keeping the current architecture intact.
