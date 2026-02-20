## Task: Add rate limiting, error handling, and unit tests
## Status: Complete

### What Was Implemented
- Added GraphQL RATELIMITED extension code detection in linearFetch
- Comprehensive error mapping verified:
  - HTTP 401/403 -> AUTH_FAILED (retryable: false) - already existed
  - HTTP 429 -> RATE_LIMITED (retryable: true) - already existed
  - Network/fetch errors -> NETWORK_ERROR (retryable: true) - already existed
  - Upload PUT failures -> UPLOAD_FAILED (retryable: false)
  - GraphQL RATELIMITED -> RATE_LIMITED (retryable: true) - NEW
- Created upload.test.ts with 30 tests covering:
  - Happy path (requestUploadUrl + PUT flow, returns assetUrl)
  - Buffer and Blob input handling
  - Additional headers from fileUpload response applied to PUT
  - Content type detection (9 tests for various extensions)
  - Error handling (8 tests: PUT failures, auth, rate limiting, network errors, GraphQL RATELIMITED)
  - PUT request structure verification (4 tests)
- Added 4 tests to graphql.test.ts (requestUploadUrl + RATELIMITED detection)
- Updated adapter.test.ts fileUploadData helper for new response shape
- Updated graphql.test.ts FILE_UPLOAD_MUTATION constant assertions

### Tests
- Linear package: 92 tests passing (4 test files)
- Core package: 52 tests passing
- Total: 144 tests passing across all packages

### Files Created/Modified
- `packages/linear/src/__tests__/upload.test.ts` - Created (30 tests)
- `packages/linear/src/__tests__/graphql.test.ts` - Modified (added 5 tests)
- `packages/linear/src/__tests__/adapter.test.ts` - Modified (updated helper)
- `packages/linear/src/graphql.ts` - Modified (RATELIMITED detection)

### Validation Results
- TypeCheck: Pass (exit code 0)
- Lint: Pass (exit code 0)
- Tests: 92/92 passing in linear, 144 total
- Build: Pass (exit code 0)
- Smoke: Pass (all methods are functions)
