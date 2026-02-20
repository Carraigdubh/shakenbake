## Task: Implement testConnection and add unit tests
## Status: Complete

### What Was Implemented
- Implemented `testConnection()` in LinearAdapter: returns true on valid creds, false on auth failure, throws on network error
- Implemented `uploadImage()` with two-step Linear file upload flow
- Created comprehensive test suite with 57 tests across 3 test files

### Tests
- `adapter.test.ts`: 31 tests covering constructor, testConnection, createIssue, uploadImage, headers, rate limiting
- `graphql.test.ts`: 14 tests covering linearFetch error handling, headers, GraphQL error mapping
- `markdown.test.ts`: 12 tests covering description builder, context table, console errors, graceful handling

### Files Created/Modified
- `packages/linear/src/adapter.ts` - testConnection and uploadImage implementation
- `packages/linear/src/__tests__/adapter.test.ts` - 31 adapter tests
- `packages/linear/src/__tests__/graphql.test.ts` - 14 GraphQL tests
- `packages/linear/src/__tests__/markdown.test.ts` - 12 markdown tests

### Validation Results
- TypeCheck: PASS
- Lint: PASS
- Tests: 57/57 passing (linear) + 52/52 passing (core) = 109 total
- Build: PASS
- Smoke: PASS (LinearAdapter instantiates correctly from dist)
