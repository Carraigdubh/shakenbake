## Task: Add MockAdapter to core exports and write tests
## Status: Complete

### What Was Implemented
- Exported `MockAdapter` and `MockAdapterConfig` from `packages/core/src/index.ts`
- Created comprehensive test suite in `packages/core/src/__tests__/mock-adapter.test.ts` with 18 tests

### Tests (18 tests, all passing)
- MockAdapter.name is 'mock'
- uploadImage returns URL containing 'mock.shakenbake.dev'
- uploadImage handles Buffer input
- uploadImage handles Blob input
- uploadImage logs filename and size
- createIssue returns SubmitResult with url, id, success: true
- createIssue stores report in submittedReports
- createIssue logs report title and metadata
- getSubmittedReports returns a copy (not internal array)
- clearReports empties the array
- Multiple reports accumulate correctly
- testConnection returns true
- delay option works for uploadImage, createIssue, and testConnection
- zero delay does not add latency
- default config (no args) works
- satisfies DestinationAdapter interface

### Files Created/Modified
- `packages/core/src/index.ts` - Added MockAdapter and MockAdapterConfig exports
- `packages/core/src/__tests__/mock-adapter.test.ts` - Created test suite
