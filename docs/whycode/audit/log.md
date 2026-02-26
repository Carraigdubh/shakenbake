# WhyCode Audit Log

## 2026-02-20T18:44:00Z - Plan 01-01: Core Types & Plugin Interfaces

**Agent**: whycode:backend-agent | **Iteration**: 1 | **Outcome**: PLAN_COMPLETE

### Tasks Completed
- **task-001**: Created TypeScript types and interfaces (types.ts) - BugReport, DeviceContext with 11 sub-interfaces, CaptureResult, ReportInput, SubmitResult, ShakeNbakeConfig, 4 plugin interfaces
- **task-002**: Created ShakeNbakeError class and error codes (errors.ts) - ErrorCode type, retryable logic, ERROR_MESSAGES mapping
- **task-003**: Created ReportBuilder class and PluginRegistry (report-builder.ts, plugin-registry.ts) - build() with UUID/timestamp, startCapture(), collectContext(), submit()

### Verification
- typecheck: PASS (exit 0)
- lint: PASS (exit 0)
- test: PASS (28/28)
- build: PASS (exit 0)
- smoke: PASS (core importable, all exports present)

### Commit
- `95c0044` feat(01-01): implement core types, plugin interfaces, errors, and report builder

---

## 2026-02-20T18:45Z - Plan 01-01 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 01-01 (Core Types & Plugin Interfaces)
- **Result**: PASS
- **Tests**: 28/28 passing
- **Iterations**: 1

---

## 2026-02-20T18:51:00Z - Plan 01-02: Core ReportBuilder & Plugin Registry

**Agent**: whycode:backend-agent | **Iteration**: 1 | **Outcome**: PLAN_COMPLETE

### Tasks Completed
- **task-004**: Refactored PluginRegistry to use Maps (duplicate prevention), added clear() method
- **task-005**: Enhanced ReportBuilder submit() with ShakeNbakeError wrapping, added fallbackUUID for older runtimes, collectContext handles individual collector failures gracefully
- **task-006**: Expanded test suite from 28 to 52 tests covering all edge cases

### Verification
- typecheck: PASS (exit 0)
- lint: PASS (exit 0)
- test: PASS (52/52)
- build: PASS (exit 0)
- smoke: PASS (PluginRegistry and ReportBuilder instantiate without errors)

---

## 2026-02-20T18:51Z - Plan 01-02 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 01-02 (Core ReportBuilder & Plugin Registry)
- **Result**: PASS
- **Tests**: 52/52 passing
- **Iterations**: 1

---

## 2026-02-20T18:50Z - Plan 01-02 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 01-02 (Core ReportBuilder & Plugin Registry)
- **Result**: PASS
- **Tests**: 52/52 passing
- **Iterations**: 1

---

## 2026-02-20T19:04:00Z - Plan 02-01: Linear Adapter - Issue Creation

**Agent**: whycode:backend-agent | **Iteration**: 1 | **Outcome**: PLAN_COMPLETE

### Tasks Completed
- **task-007**: Created LinearAdapter class with LinearConfig types, DEFAULT_SEVERITY_MAPPING, and full DestinationAdapter interface implementation
- **task-008**: Implemented issueCreate via GraphQL with linearFetch wrapper, markdown description builder, severity-to-priority mapping, file upload two-step flow, and graceful screenshot fallback
- **task-009**: Implemented testConnection (returns true/false for auth, throws for network), uploadImage with two-step flow, and 57 comprehensive unit tests across 3 test files

### Verification
- typecheck: PASS (exit 0) - all 6 packages
- lint: PASS (exit 0) - all 6 packages
- test: PASS (109 total: 52 core + 57 linear)
- build: PASS (exit 0) - all 6 packages
- smoke: PASS (LinearAdapter instantiates from dist, name='linear')

---

## 2026-02-20T19:00Z - Plan 02-01 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 02-01 (Linear Adapter - Issue Creation)
- **Result**: PASS
- **Tests**: 109/109 passing (52 core + 57 linear)
- **Iterations**: 1

---

## 2026-02-20T19:13:00Z - Plan 02-02: Linear Adapter - File Upload

**Agent**: whycode:backend-agent | **Iteration**: 1 | **Outcome**: PLAN_COMPLETE

### Tasks Completed
- **task-010**: Updated FILE_UPLOAD_MUTATION with `success` and `headers { key value }`, added FileUploadHeader/UploadUrlResult types, created requestUploadUrl helper function
- **task-011**: Refactored uploadImage to use requestUploadUrl, added content type detection via static detectContentType(), applies additional headers from fileUpload response to PUT, handles Buffer and Blob inputs
- **task-012**: Added GraphQL RATELIMITED extension code detection in linearFetch, created upload.test.ts with 30 tests, added 5 tests to graphql.test.ts, updated adapter.test.ts for new response shape

### Verification
- typecheck: PASS (exit 0) - all 6 packages
- lint: PASS (exit 0) - all 6 packages
- test: PASS (144 total: 52 core + 92 linear)
- build: PASS (exit 0) - all 6 packages
- smoke: PASS (LinearAdapter methods all functions, requestUploadUrl exported)

---

## 2026-02-20T19:13Z - Plan 02-02 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 02-02 (Linear Adapter - File Upload)
- **Result**: PASS
- **Tests**: 144/144 passing (52 core + 92 linear)
- **Iterations**: 1

---

## 2026-02-20T20:11:00Z - Plan 06-01: MockAdapter & Final Polish

**Agent**: whycode:backend-agent | **Iteration**: 1 | **Outcome**: PLAN_COMPLETE

### Tasks Completed
- **task-034**: Created MockAdapter class implementing DestinationAdapter interface. Uses platform-agnostic UUID generation (no node:crypto import). Supports configurable delay, in-memory report storage, and test helpers (getSubmittedReports, clearReports).
- **task-035**: Exported MockAdapter and MockAdapterConfig from core index.ts. Created 18 comprehensive unit tests covering all methods, edge cases, delay behavior, and interface compliance.
- **task-036**: Full monorepo integration verification. Fixed node:crypto webpack bundling issue in MockAdapter. Fixed example app graceful script fallbacks for missing deps.

### Verification
- typecheck: PASS (exit 0) - all 8 packages
- lint: PASS (exit 0) - all 8 packages
- test: PASS (391 total: 70 core + 92 linear + 142 web + 87 react-native)
- build: PASS (exit 0) - all 8 packages including nextjs-example
- smoke: PASS (MockAdapter, PluginRegistry, ReportBuilder, ShakeNbakeError all export as functions)

---

## 2026-02-20T20:11Z - Plan 06-01 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 06-01 (MockAdapter & Final Polish)
- **Result**: PASS
- **Tests**: 391/391 passing (70 core + 92 linear + 142 web + 87 react-native)
- **Iterations**: 1

---

## 2026-02-26T11:10:00Z - Plan 01-02: Convex Backend Setup + Schema

**Agent**: whycode:backend-convex-agent | **Iteration**: 1 | **Outcome**: PLAN_COMPLETE

### Tasks Completed
- **task-001**: Installed convex (1.32.0) and @clerk/nextjs (6.38.2). Created Providers component with ClerkProvider + ConvexProviderWithClerk wrapping. Includes env var guard for NEXT_PUBLIC_CONVEX_URL.
- **task-002**: Defined Convex schema with 4 tables (organizations, apps, apiKeys, reports) and proper indexes. Created auth.config.ts for Clerk JWT provider. Added convex/tsconfig.json.
- **task-003**: Created Clerk middleware protecting non-public routes (/, /sign-in, /sign-up, /api/ingest are public). Full monorepo verification suite passes.

### Verification
- typecheck: PASS (exit 0) - all 8 packages
- lint: PASS (exit 0) - all 8 packages
- test: PASS (142 total)
- build: PASS (exit 0) - all 8 packages
- smoke: PASS (Next.js dev server starts, Clerk middleware bundled at 86.8 kB)

### Safety
- Convex mode: cloud-live (user-confirmed)
- Blocked commands: npx convex dev, npx convex deploy
- Runtime requires: NEXT_PUBLIC_CONVEX_URL, CONVEX_DEPLOYMENT, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_JWT_ISSUER_DOMAIN

---

## 2026-02-26T11:15Z - Plan 01-02 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 01-02 (Convex Backend Setup + Schema)
- **Result**: PASS
- **Tests**: 142/142 passing
- **Iterations**: 1

---

## 2026-02-26T11:25:00Z - Plan 02-01: Convex Functions - Organizations and Apps

**Agent**: whycode:backend-convex-agent | **Iteration**: 1 | **Outcome**: PLAN_COMPLETE

### Tasks Completed
- **task-001**: Created organizations.ts with ensureOrganization (mutation), getOrganization (query by clerkOrgId), getOrganizationById (query by ID). Also created _generated stubs (server.ts, dataModel.d.ts) matching Convex codegen templates.
- **task-002**: Created apps.ts with createApp (mutation), listApps (query by orgId), getApp (query by ID), deleteApp (mutation with cascading API key deletion).
- **task-003**: Created apiKeys.ts with generateApiKey (mutation, snb_app_ prefix), listApiKeys (query with masked keys), revokeApiKey (mutation), validateApiKey (internalQuery for HTTP ingestion).

### Verification
- typecheck: PASS (exit 0) - all 8 packages
- lint: PASS (exit 0) - all 8 packages
- test: PASS (407 total: 80 core + 97 linear + 142 web + 88 react-native)
- build: PASS (exit 0) - all 8 packages
- smoke: PASS (Next.js dev server starts at localhost:3000, Ready in 1670ms)

### Safety
- Convex mode: cloud-live (capability-plan)
- Blocked commands: npx convex dev, npx convex deploy, npx convex dev --local
- _generated stubs will be overwritten by codegen during CI/CD deployment

---

## 2026-02-26T11:25Z - Plan 02-01 Completed

- **Phase**: 5 (Implementation)
- **Plan**: 02-01 (Convex Functions - Organizations and Apps)
- **Result**: PASS
- **Tests**: 407/407 passing
- **Iterations**: 1
