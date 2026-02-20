## Task: Create MockAdapter implementing DestinationAdapter
## Status: Complete

### What Was Implemented
- Created `MockAdapter` class in `packages/core/src/mock-adapter.ts`
- Implements the `DestinationAdapter` interface with `name`, `uploadImage`, `createIssue`, and `testConnection`
- Stores submitted reports in memory for test assertion via `getSubmittedReports()`
- Supports configurable delay for simulating network latency
- Uses platform-agnostic UUID generation (no `node:crypto` import) to work in both Node.js and browser environments

### Files Created/Modified
- `packages/core/src/mock-adapter.ts` - Created MockAdapter implementation

### Decisions Made
- Used `globalThis.crypto.randomUUID()` with Math.random fallback instead of `node:crypto` import to avoid webpack bundling issues when used in web contexts
- Console logging kept minimal: filename+size for uploads, title+severity+category for issues
