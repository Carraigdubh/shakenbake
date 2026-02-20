## Task: Implement fileUpload mutation (signed URL flow)
## Status: Complete

### What Was Implemented
- Updated FILE_UPLOAD_MUTATION to include `success` and `headers { key value }` fields
- Added `FileUploadHeader` interface for typed header key-value pairs
- Updated `FileUploadData` interface to include `success: boolean` and `headers: FileUploadHeader[]`
- Added `UploadUrlResult` interface for the return type of `requestUploadUrl`
- Added `requestUploadUrl` helper function that calls the mutation via `linearFetch` and returns `{ uploadUrl, assetUrl, headers }`
- Exported new types and function from `index.ts`

### Files Modified
- `packages/linear/src/graphql.ts` - Updated mutation, added types and helper function
- `packages/linear/src/index.ts` - Added exports for new types and function

### Decisions Made
- requestUploadUrl checks `data.fileUpload.success` and throws UPLOAD_FAILED if false
- Headers are returned as an array of `{ key, value }` objects matching Linear's API shape
