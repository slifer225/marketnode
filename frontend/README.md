# Task Tracker UI (React + TanStack Query + Vite)

This frontend surfaces the task tracker experience that pairs with the NestJS API. It is built with React, TanStack Query, and Zod on top of Vite for fast dev loops, optimistic updates, and accessible feedback for CRUD operations.

---

## 1. Tech Stack & Operations

| Layer         | Choice              | Why it fits here                                                              |
| ------------- | ------------------- | ----------------------------------------------------------------------------- |
| Runtime       | **Node.js 20+**     | LTS                                                                           |
| Framework     | **React 18 + Vite** | React by default. Vite for faster spin up and improve build performance       |
| Data Fetching | **TanStack Query**  | Simplified data fetching and state management with built in cache.            |
| Validation    | **Zod**             | Matured and large ecosystem.                                                  |
| Styling       | **CSS Modules**     | Locale-scoped styles without runtime cost, keeps bundle lean and predictable. |

### Installation & Local Dev

```bash
pnpm install
cp .env.example .env  # set VITE_API_BASE_URL and VITE_API_TOKEN

# Development server
pnpm dev

# Type-safe production build
pnpm build

# Preview the built bundle
pnpm preview
```

> **Note:** The UI expects the backend to run on `http://localhost:3000/` by default. Update `VITE_API_BASE_URL` in `.env` if your API lives elsewhere.

### Tests

```bash
# Unit/integration tests (Vitest + Testing Library)
pnpm test

# Interactive watch mode
pnpm test:watch

# Linting & formatting
pnpm lint
pnpm format
```

---

## 2. UI Architecture & Flow

1. **AppProviders ➜ App ➜ Feature modules** – providers supply React Query and toast context before rendering the feature surface.
2. **TaskTableView container** – composes filters, table, pagination, and modal flows. It owns filter state, query parameters, and mutation orchestration.
3. **Presentational components** – `TaskTable`, `TaskFilters`, `TaskPagination`, and `TaskForm` are stateless widgets that stay focused on rendering and basic input management.
4. **API contracts** – `taskApi` centralizes HTTP calls, schema validation, and lightweight caching so components deal only with typed domain objects.

### Best Practices Applied

- **Optimistic concurrency**: mutations update cached rows immediately and roll back on error, aligning with backend version checks.
- **Schema-driven safety**: every request/response is parsed through Zod schemas to catch drift early.
- **Context-driven UX**: toast notifications surface success/error states consistently without leaking implementation details to components.
- **Separation of concerns**: fetching/mutation logic is isolated from presentation, keeping the UI testable and easy to reason about.

### Key Trade-offs

- **Table rendering**: simple table without virtualization; adequate for hundreds of rows but not for massive datasets.
- **Manual form state**: `TaskForm` manages its own state instead of using external form libraries, trading boilerplate for tighter control over validation UX.
- **Token-only auth**: mirrors the backend’s bearer token model, so rotation and renewal sit outside the UI (e.g., environment config).

---

## 3. Data Fetching & Caching

- **TanStack Query** powers list fetching with automatic caching keyed by filters, retry-once semantics, and disabled refetch-on-focus to avoid interfering with modal edits.
- **Custom task cache** inside `taskApi` avoids overfetching when filters repeat within a short TTL. Mutations clear the cache so fresh reads rehydrate after optimistic updates.
- **Abort-aware requests** leverage the signal provided by TanStack Query to cancel in-flight fetches when filters change rapidly.
- **Env-driven base URL/token** keeps the API location configurable at build time while falling back to localhost for DX.

**Trade-offs:** The in-memory cache is intentionally simple (no persistence across sessions). When scaling to multiple feature surfaces, consider moving cache invalidation to a shared utility or relying solely on TanStack Query’s cache policies.

---

## 4. Error Handling & Feedback

- **Problem Details parsing**: responses go through `problemDetailsSchema` so user-facing messages stay aligned with the backend’s RFC 7807 contract.
- **Typed `TaskApiError`** represents configuration, network, problem, and unexpected errors. Components render concise messages and accessibility attributes accordingly.
- **Toast system**: informative toasts appear for create/update/delete outcomes with auto-dismiss and manual controls. List-level errors render inline to avoid hiding structural failures.

**Trade-offs:** Errors display the first available message—great for clarity, but richer field-level surfacing (e.g., mapping nested validation errors) would require extending the toast/list presentation.

---

## 5. Forms & Validation

- **Draft parsing** with `taskDraftSchema.safeParse` ensures the payload respects backend rules before hitting the network.
- **Inline assistance**: form field hints, `aria-invalid`, role-based alerts, and disabled past dates improve UX accessibility and correctness.
- **Tag input ergonomics**: adds chips on space press, prevents duplicates (case-insensitive), and caps the list to 20 entries to match backend expectations.

**Trade-offs:** Form state uses controlled inputs for predictability, but this makes it less ergonomic if the form grows substantially; adopting a dedicated form library could improve scalability.

---

## 6. UI Composition & Styling

- **CSS Modules** scope styles per component, avoiding global collisions while keeping build-time guarantees.
- **Responsive layout**: flexbox-based layout adapts to narrow widths by stacking filters under controls, with consistent spacing tokens defined in `App.module.css`.
- **Accessibility touches**: modal focus traps, labeled controls, polite live regions for loading states, and keyboard-friendly tag management keep the UI inclusive.

**Trade-offs:** There is no design system or theme abstraction yet; replicating visual tokens across new components may introduce duplication until a shared token layer is introduced.

---

## 7. Testing Strategy

- **Unit tests** validate `taskApi` parsing, cache behaviour, and schema normalization using MSW to simulate backend responses.
- **Component tests** cover `TaskTableView` interactions (filters, optimistic state, toasts) with Testing Library + JSDOM.
- **Test harness**: Vitest setup bootstraps an MSW server (`src/test/server.ts`) so each suite runs against realistic HTTP contracts.
- **Coverage tooling**: `pnpm test -- --coverage` generates text/HTML reports via V8 instrumentation for quick insight.

**Trade-offs:** Browser-level and visual regression tests are not yet included; consider adding Playwright or Cypress once the UI hardens.

---

## 8. Environment & Troubleshooting

- `.env.example` documents the required `VITE_API_BASE_URL` and `VITE_API_TOKEN`. Copy it to `.env` before running `pnpm dev`.
- If you see `VITE_API_TOKEN is required` toasts during mutations, double-check the token matches the backend `.env`.
- When the backend is unreachable, the UI surfaces network errors via toast and inline messaging; open the browser console for detailed logs.
- Adjust `staleTime` and retry policies in `AppProviders.tsx` if your deployment profile needs different caching semantics.

---

## 9. Future Enhancements

1. **Forms** – support draft autosave and richer validation info
2. **Theming** – use Tailwinds for standardized css
3. **Observability** – client side analytics with tools such as GA and client error collection via tools such as sentry
