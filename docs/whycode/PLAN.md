<plan id="02-01" linear-id="SHA-7">
  <name>Convex Functions - Organizations and Apps</name>
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
    <testing>vitest</testing>
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

  <available-tools>
    <linear enabled="true">Update issues after each task</linear>
    <context7 enabled="false">Not available</context7>
  </available-tools>

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
    Plans 01-01 and 01-02 are COMPLETE. apps/cloud/ now has:
    - Working Next.js 15 with React 19, Tailwind v4, shadcn/ui
    - Convex installed with schema.ts defining: organizations, apps, apiKeys, reports
    - Clerk installed with middleware.ts protecting /dashboard/*
    - ConvexProviderWithClerk wrapping the app
    - All monorepo builds, typechecks, lints, tests pass (142 tests)

    The Convex schema (apps/cloud/convex/schema.ts) already defines:
    - organizations: clerkOrgId (indexed), name, createdAt
    - apps: orgId (indexed), name, platform, createdAt
    - apiKeys: appId (indexed), orgId (indexed), key (indexed), isActive, createdAt
    - reports: full report schema with storage IDs

    This plan creates the Convex server functions (queries/mutations) for:
    1. Organization sync (upsert from Clerk context)
    2. App CRUD (create, list, get, delete with cascading)
    3. API key generation and validation

    IMPORTANT: These are Convex server functions. They use:
    - import { query, mutation, internalQuery } from "./_generated/server"
    - import { v } from "convex/values" for argument validation
    - ctx.auth.getUserIdentity() for Clerk auth context
    - ctx.db.query("tableName").withIndex("by_field", q => q.eq("field", value))
    - ctx.db.insert("tableName", { ... })
    - ctx.db.patch(id, { ... })
    - ctx.db.delete(id)

    DO NOT run npx convex dev or npx convex deploy (cloud-live safety).
    Just write the function files and ensure they compile.
  </context>

  <tasks>
    <task id="task-001" type="auto" linear-id="SHA-7">
      <name>Organization sync functions</name>
      <files>apps/cloud/convex/organizations.ts</files>
      <action>
        Create apps/cloud/convex/organizations.ts with:

        1. ensureOrganization mutation:
           - Args: none (gets org from auth context)
           - Get user identity from ctx.auth.getUserIdentity()
           - Extract org ID from identity claims (Clerk puts it in the token)
           - Check if org exists via organizations.by_clerkOrgId index
           - If exists: return existing org ID
           - If not: insert new org record, return new ID
           - Throw if no auth context

        2. getOrganization query:
           - Args: { clerkOrgId: v.string() }
           - Look up by index, return org or null

        3. getOrganizationById query:
           - Args: { orgId: v.id("organizations") }
           - Direct get by ID, return org

        All functions must use proper Convex patterns (query/mutation from _generated/server).
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Organization functions compile. ensureOrganization upserts, getOrganization queries by clerkOrgId.</done>
    </task>

    <task id="task-002" type="auto" linear-id="SHA-7">
      <name>App CRUD functions</name>
      <files>apps/cloud/convex/apps.ts</files>
      <action>
        Create apps/cloud/convex/apps.ts with:

        1. createApp mutation:
           - Args: { name: v.string(), platform: v.union(...), orgId: v.id("organizations") }
           - Verify auth context
           - Insert app record with orgId, name, platform, createdAt
           - Return new app ID

        2. listApps query:
           - Args: { orgId: v.id("organizations") }
           - Query apps.by_orgId index
           - Return array of apps

        3. getApp query:
           - Args: { appId: v.id("apps") }
           - Get app by ID
           - Return app or null

        4. deleteApp mutation:
           - Args: { appId: v.id("apps") }
           - Verify auth
           - Delete all apiKeys for this app (query by appId index, delete each)
           - Delete the app record
           - Return success
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>App CRUD functions compile. Create, list, get, delete with cascading key deletion.</done>
    </task>

    <task id="task-003" type="auto" linear-id="SHA-7">
      <name>API key generation and validation functions</name>
      <files>apps/cloud/convex/apiKeys.ts</files>
      <action>
        Create apps/cloud/convex/apiKeys.ts with:

        1. generateApiKey mutation:
           - Args: { appId: v.id("apps"), orgId: v.id("organizations") }
           - Verify auth
           - Generate key: "snb_app_" + 32 random hex chars
           - Use crypto-safe random: Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join("")
             OR use a simple random approach that works in Convex runtime
           - Insert into apiKeys table with isActive: true
           - Return the full key (shown to user once)

        2. listApiKeys query:
           - Args: { appId: v.id("apps") }
           - Query by appId index
           - Return keys with key field masked (show only last 4 chars): "snb_app_****...XXXX"

        3. revokeApiKey mutation:
           - Args: { keyId: v.id("apiKeys") }
           - Verify auth
           - Patch isActive to false

        4. validateApiKey (internal query - not exposed to client):
           - Use internalQuery from _generated/server
           - Args: { key: v.string() }
           - Look up by key index
           - Return { appId, orgId, isActive } if found, null if not
           - This will be used by the HTTP ingestion endpoint in plan 02-02
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit &amp;&amp; yarn build</verify>
      <done>API key functions compile. Generate with snb_app_ prefix, list with masking, revoke, internal validate. Full build passes.</done>
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
