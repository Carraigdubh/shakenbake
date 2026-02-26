<plan id="02-02" linear-id="SHA-8">
  <name>Report Ingestion Endpoint</name>
  <type>backend</type>
  <phase>2</phase>

  <completion-contract>
    <rule>You CANNOT output PLAN_COMPLETE until ALL verifications pass</rule>
    <rule>If any verification fails, FIX IT and try again</rule>
    <rule>You have multiple iterations - USE THEM</rule>
    <rule>The orchestrator verifies externally - lying = sent back to fix</rule>
  </completion-contract>

  <completion-mode>partial</completion-mode>

  <immutable-decisions>
    <package-manager>yarn</package-manager>
    <framework>next</framework>
    <monorepo>turborepo</monorepo>
    <language>typescript</language>
    <auth>clerk</auth>
    <database>convex</database>
    <convex-mode>cloud-live</convex-mode>
    <hosting>vercel</hosting>
  </immutable-decisions>

  <pm-commands>
    <install>yarn install</install>
    <add-dep>yarn add</add-dep>
    <build>yarn build</build>
    <test>yarn test</test>
    <typecheck>yarn typecheck</typecheck>
    <lint>yarn lint</lint>
    <dev>yarn dev</dev>
  </pm-commands>

  <final-verification>
    <check name="typecheck" command="yarn typecheck" required="true"/>
    <check name="lint" command="yarn lint" required="true"/>
    <check name="test" command="yarn test" required="true"/>
    <check name="build" command="yarn build" required="true"/>
    <check name="smoke" command="cd apps/cloud &amp;&amp; timeout 15 yarn dev 2>&amp;1 | head -30" required="true">
      <fail-if-contains>Error:</fail-if-contains>
      <fail-if-contains>TypeError</fail-if-contains>
    </check>
  </final-verification>

  <context>
    Plans 01-01, 01-02, 02-01, and 03-01 are COMPLETE. apps/cloud/ now has:
    - Working Next.js 15 with Tailwind v4, shadcn/ui
    - Convex schema: organizations, apps, apiKeys, reports tables
    - Convex functions: organizations.ts (ensureOrg, getOrg), apps.ts (CRUD), apiKeys.ts (generate, list, revoke, validateApiKey internal)
    - Clerk auth pages, dashboard layout with sidebar/header
    - Marketing landing page
    - All builds/typechecks/tests pass

    This plan creates the HTTP ingestion endpoint that SDK clients POST bug reports to.

    KEY ARCHITECTURE:
    - Convex HTTP actions are used for public API endpoints (not authenticated via Clerk)
    - SDK clients send reports with API key in Authorization header
    - The HTTP action validates the key using the internal validateApiKey query
    - Screenshots/audio are base64-encoded in the report JSON body
    - Files are stored in Convex file storage via ctx.storage.store()
    - A report record is created linking to the stored files

    EXISTING FILES TO READ:
    - apps/cloud/convex/apiKeys.ts - has validateApiKey internalQuery
    - apps/cloud/convex/schema.ts - has reports table schema
    - apps/cloud/convex/_generated/server.ts - has httpAction, internalQuery etc.
    - packages/core/src/types.ts - has BugReport type definition

    CONVEX HTTP ACTION PATTERN:
    - import { httpRouter } from "convex/server"
    - import { httpAction } from "./_generated/server"
    - const http = httpRouter()
    - http.route({ path: "/api/ingest", method: "POST", handler: httpAction(async (ctx, request) => { ... }) })
    - export default http

    DO NOT run npx convex dev/deploy (cloud-live safety).
  </context>

  <tasks>
    <task id="task-001" type="auto" linear-id="SHA-8">
      <name>Convex HTTP router for ingestion</name>
      <files>apps/cloud/convex/http.ts</files>
      <action>
        Create apps/cloud/convex/http.ts:

        1. Import httpRouter from "convex/server"
        2. Import httpAction from "./_generated/server"
        3. Import internal API reference from "./_generated/api"
        4. Create HTTP router
        5. Register POST /api/ingest route with handler:
           a. Extract Authorization header: "Bearer snb_app_xxx"
           b. If no/invalid header format: return Response with 401
           c. Call ctx.runQuery(internal.apiKeys.validateApiKey, { key }) to validate
           d. If invalid/inactive key: return 401
           e. Parse JSON body
           f. Validate required fields (title, description, severity, category)
           g. If malformed: return 400 with error details
           h. Return 200 with { success: true, message: "Report received" } for now
              (actual storage will be in task-002)
        6. Add CORS headers for cross-origin requests:
           - Access-Control-Allow-Origin: *
           - Access-Control-Allow-Methods: POST, OPTIONS
           - Access-Control-Allow-Headers: Authorization, Content-Type
        7. Add OPTIONS handler for CORS preflight
        8. Export default http
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>HTTP router compiles. POST /api/ingest validates auth header and body. CORS headers set. 401 for bad auth, 400 for bad body.</done>
    </task>

    <task id="task-002" type="auto" linear-id="SHA-8">
      <name>Report storage with file uploads</name>
      <files>apps/cloud/convex/reports.ts</files>
      <action>
        Create apps/cloud/convex/reports.ts:

        1. ingestReport mutation (internal - called from HTTP action):
           - Args: appId, orgId, title, description, severity, category, externalId,
                   context (v.any()), customMetadata (v.optional),
                   screenshotAnnotated (v.optional v.string - base64),
                   screenshotOriginal (v.optional v.string - base64),
                   audio (v.optional v.string - base64)
           - For each base64 file provided:
             * Decode base64 to Uint8Array
             * Create Blob
             * Store via ctx.storage.store(blob)
             * Get storage ID
           - Insert report record with all fields + storage IDs
           - Return { reportId: id, success: true }

        2. Update http.ts to call ingestReport after validation:
           - Extract all fields from JSON body
           - Call ctx.runMutation(internal.reports.ingestReport, { ... })
           - Return the result with 200

        Note: Use internalMutation for ingestReport since it's called from HTTP action,
        not directly from client.
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>ingestReport stores reports with file uploads. HTTP action calls it after validation. TypeScript compiles.</done>
    </task>

    <task id="task-003" type="auto" linear-id="SHA-8">
      <name>Report query functions</name>
      <files>apps/cloud/convex/reports.ts</files>
      <action>
        Add to apps/cloud/convex/reports.ts:

        1. listReports query:
           - Args: { orgId, appId (optional), severity (optional), paginationOpts }
           - Use Convex pagination: ctx.db.query("reports").withIndex(...).paginate(paginationOpts)
           - Filter by orgId (required), optionally by appId, severity
           - Order by createdAt descending
           - Return paginated results

        2. getReport query:
           - Args: { reportId: v.id("reports") }
           - Get report by ID
           - For each storage ID, generate URL via ctx.storage.getUrl(storageId)
           - Return report with resolved file URLs

        3. getReportCounts query:
           - Args: { orgId: v.id("organizations") }
           - Count reports by severity for the org
           - Return { total, low, medium, high, critical }

        Run full verification: yarn build && yarn typecheck && yarn lint
      </action>
      <verify>yarn build &amp;&amp; yarn typecheck</verify>
      <done>Reports queryable with pagination, filters. getReport resolves storage URLs. getReportCounts returns severity breakdown. Full build passes.</done>
    </task>
  </tasks>

  <on-complete>
    BEFORE outputting PLAN_COMPLETE, verify:
    □ All task verify commands passed
    □ yarn typecheck passed (exit code 0)
    □ yarn lint passed (exit code 0)
    □ yarn test passed (all existing tests still pass)
    □ yarn build passed (exit code 0)
    □ Smoke: dev server starts without crashing

    If ANY failed: FIX and re-verify. Do NOT output PLAN_COMPLETE.
  </on-complete>
</plan>
