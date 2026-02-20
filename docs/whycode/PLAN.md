<plan id="02-02">
  <name>Linear Adapter - File Upload</name>
  <type>backend</type>
  <phase>2</phase>

  <completion-contract>
    <rule>You CANNOT output PLAN_COMPLETE until ALL verifications pass</rule>
    <rule>If any verification fails, FIX IT and try again</rule>
    <rule>You have multiple iterations - USE THEM</rule>
    <rule>The orchestrator verifies externally - lying = sent back to fix</rule>
  </completion-contract>

  <completion-mode>strict</completion-mode>

  <immutable-decisions>
    <package-manager>yarn</package-manager>
    <monorepo>turborepo</monorepo>
    <language>typescript</language>
    <testing>vitest</testing>
  </immutable-decisions>

  <pm-commands>
    <install>yarn install</install>
    <add-dep>yarn add</add-dep>
    <build>yarn build</build>
    <test>yarn test</test>
    <typecheck>yarn typecheck</typecheck>
    <lint>yarn lint</lint>
  </pm-commands>

  <available-tools>
    <linear enabled="false">Skip Linear updates</linear>
    <context7 enabled="false">Not available</context7>
  </available-tools>

  <final-verification>
    <check name="typecheck" command="yarn typecheck" required="true"/>
    <check name="lint" command="yarn lint" required="true"/>
    <check name="test" command="yarn test" required="true"/>
    <check name="build" command="yarn build" required="true"/>
    <check name="smoke" command="node -e &quot;const l = require('./packages/linear/dist/index.js'); const a = new l.LinearAdapter({ apiKey: 'test', teamId: 'test' }); console.log('uploadImage:', typeof a.uploadImage, 'createIssue:', typeof a.createIssue, 'testConnection:', typeof a.testConnection);&quot;" required="true">
      <fail-if-contains>Error:</fail-if-contains>
      <description>All LinearAdapter methods must be functions</description>
    </check>
  </final-verification>

  <context>
    Plans 01-01, 01-02, and 02-01 are COMPLETE. The Linear adapter already has:
    - packages/linear/src/types.ts: LinearConfig
    - packages/linear/src/graphql.ts: linearFetch, ISSUE_CREATE_MUTATION, VIEWER_QUERY, FILE_UPLOAD_MUTATION
    - packages/linear/src/markdown.ts: buildIssueDescription
    - packages/linear/src/adapter.ts: LinearAdapter with createIssue and testConnection
    - 57 tests passing in packages/linear

    This plan completes uploadImage (file upload via signed URL) and adds rate limiting + comprehensive error handling.

    Discovery finding: Linear file upload is two-step:
    1. fileUpload mutation → returns { uploadUrl, assetUrl }
    2. PUT file to uploadUrl with correct headers
    Upload URLs expire in ~60 seconds.
  </context>

  <tasks>
    <task id="task-010" type="auto">
      <name>Implement fileUpload mutation (signed URL flow)</name>
      <files>packages/linear/src/graphql.ts, packages/linear/src/adapter.ts</files>
      <action>
        Ensure FILE_UPLOAD_MUTATION is defined in graphql.ts:
        mutation FileUpload($contentType: String!, $filename: String!, $size: Int!) {
          fileUpload(contentType: $contentType, filename: $filename, size: $size) {
            success
            uploadFile { uploadUrl assetUrl headers { key value } }
          }
        }

        Add a helper function requestUploadUrl(apiKey, apiUrl, filename, contentType, size) that:
        - Calls FILE_UPLOAD_MUTATION via linearFetch
        - Returns { uploadUrl, assetUrl, headers }
        - Throws ShakeNbakeError on failure
      </action>
      <verify>cd packages/linear && npx tsc --noEmit</verify>
      <done>requestUploadUrl function exists and compiles. FILE_UPLOAD_MUTATION is defined.</done>
    </task>

    <task id="task-011" type="auto">
      <name>Implement uploadImage (PUT to signed URL)</name>
      <files>packages/linear/src/adapter.ts</files>
      <action>
        Complete the uploadImage(imageData: Buffer | Blob, filename: string) method in LinearAdapter:
        1. Determine content type from filename extension (png → image/png, jpg → image/jpeg, webm → audio/webm)
        2. Determine size from imageData (Buffer.byteLength or Blob.size)
        3. Call requestUploadUrl to get signed URL and asset URL
        4. PUT imageData to uploadUrl with:
           - Content-Type header
           - Cache-Control: public, max-age=31536000
           - Any additional headers from the fileUpload response
        5. Return assetUrl string
        6. Handle both Buffer (Node.js/RN) and Blob (browser) inputs
        7. Wrap errors as ShakeNbakeError with UPLOAD_FAILED code
      </action>
      <verify>cd packages/linear && npx tsc --noEmit</verify>
      <done>uploadImage is fully implemented. Handles Buffer and Blob. Calls requestUploadUrl then PUTs to signed URL. Returns assetUrl.</done>
    </task>

    <task id="task-012" type="auto">
      <name>Add rate limiting, error handling, and unit tests</name>
      <files>packages/linear/src/adapter.ts, packages/linear/src/__tests__/adapter.test.ts, packages/linear/src/__tests__/upload.test.ts</files>
      <action>
        Add rate limit handling:
        - In linearFetch, check for HTTP 429 or GraphQL error with code RATELIMITED
        - Throw ShakeNbakeError with RATE_LIMITED code (retryable: true)
        - Check X-RateLimit-Remaining header if present

        Ensure comprehensive error mapping:
        - HTTP 401/403 → AUTH_FAILED (retryable: false)
        - HTTP 429 → RATE_LIMITED (retryable: true)
        - Network/fetch errors → NETWORK_ERROR (retryable: true)
        - Upload PUT failures → UPLOAD_FAILED (retryable: false)

        Add/update tests:
        - Test uploadImage calls requestUploadUrl then PUTs to signed URL
        - Test uploadImage returns assetUrl on success
        - Test uploadImage handles Buffer input correctly
        - Test uploadImage handles Blob input correctly
        - Test uploadImage throws UPLOAD_FAILED on PUT failure
        - Test rate limit detection (429 status → RATE_LIMITED error)
        - Test auth failure (401 → AUTH_FAILED error)
        - Test network error handling

        All existing + new tests must pass.
      </action>
      <verify>cd packages/linear && npx vitest run</verify>
      <done>Rate limiting detection works. Error codes are correctly mapped. 70+ tests in linear package. All tests pass.</done>
    </task>
  </tasks>

  <on-complete>
    BEFORE outputting PLAN_COMPLETE, verify:
    □ All task verify commands passed
    □ yarn typecheck passed (exit code 0)
    □ yarn lint passed (exit code 0)
    □ yarn test passed (120+ total tests)
    □ yarn build passed (exit code 0)
    □ Smoke: LinearAdapter methods are all functions

    If ANY failed: FIX and re-verify. Do NOT output PLAN_COMPLETE.
  </on-complete>
</plan>
