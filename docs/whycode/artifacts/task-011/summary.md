## Task: Implement uploadImage (PUT to signed URL)
## Status: Complete

### What Was Implemented
- Refactored `uploadImage` to use the `requestUploadUrl` helper instead of calling `linearFetch` directly
- Content type detection extracted to static `LinearAdapter.detectContentType()` method
- Supports: png, jpg/jpeg, gif, webp, webm, m4a, svg, with fallback to application/octet-stream
- Case-insensitive filename extension matching
- Additional headers from the `fileUpload` response are applied to the PUT request
- Both Buffer (Node.js/RN) and Blob (browser) inputs handled correctly
- Buffer inputs are converted to Blob for cross-environment fetch body compatibility
- PUT request includes Content-Type, Cache-Control, and any Linear-provided headers
- Errors wrapped as ShakeNbakeError with UPLOAD_FAILED code (retryable: false for HTTP failures)

### Files Modified
- `packages/linear/src/adapter.ts` - Refactored uploadImage, added detectContentType static method

### Decisions Made
- PUT failures are retryable: false (signed URLs expire quickly, retrying is unlikely to help)
- Content type detection is a static method for easy unit testing and reuse
