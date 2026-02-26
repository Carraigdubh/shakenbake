<plan id="01-02" linear-id="SHA-6">
  <name>Convex Backend Setup + Schema</name>
  <type>backend</type>
  <phase>1</phase>

  <completion-contract>
    <rule>You CANNOT output PLAN_COMPLETE until ALL verifications pass</rule>
    <rule>If any verification fails, FIX IT and try again</rule>
    <rule>You have multiple iterations - USE THEM</rule>
    <rule>The orchestrator verifies externally - lying = sent back to fix</rule>
  </completion-contract>

  <completion-mode>partial</completion-mode>

  <immutable-decisions>
    <package-manager>yarn</package-manager>
    <package-manager-version>1.22.22</package-manager-version>
    <framework>next</framework>
    <framework-version>15</framework-version>
    <monorepo>turborepo</monorepo>
    <language>typescript</language>
    <testing>vitest</testing>
    <auth>clerk</auth>
    <database>convex</database>
    <convex-mode>cloud-live</convex-mode>
    <hosting>vercel</hosting>
    <ui>shadcn/ui + tailwindcss</ui>
  </immutable-decisions>

  <pm-commands>
    <install>yarn install</install>
    <add-dep>yarn add</add-dep>
    <add-dev-dep>yarn add --dev</add-dev-dep>
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
      <description>Next.js dev server must start without crashing</description>
    </check>
  </final-verification>

  <context>
    Plan 01-01 is COMPLETE. apps/cloud/ now has:
    - Working Next.js 15 with React 19, App Router
    - Tailwind CSS v4 with @tailwindcss/postcss
    - shadcn/ui (new-york style) with Button, Card, Input components
    - ESLint flat config, TypeScript with @/* path aliases
    - Full monorepo integration (turbo build/typecheck/lint all pass)
    - 142 existing tests pass

    This plan adds Convex as the backend and Clerk for auth. Key integration points:
    - Convex + Clerk have an official integration pattern
    - ConvexProviderWithClerk wraps the app with both providers
    - Clerk middleware protects /dashboard/* routes
    - Convex auth.config.ts configures Clerk as the auth provider

    IMPORTANT NOTES FOR CONVEX SETUP:
    - Convex mode is cloud-live (PRODUCTION). Be careful with schema changes.
    - The Convex CLI (npx convex) may require interactive login. If it does,
      use completion-mode partial and list CONVEX_DEPLOYMENT as a requirement.
    - If npx convex dev --once fails due to auth, the schema and provider code
      should still be written correctly so it works once env vars are set.
    - Add convex to apps/cloud/package.json dependencies
    - Add @clerk/nextjs to apps/cloud/package.json dependencies
    - The ConvexClerkProvider pattern uses useAuth from @clerk/nextjs

    CLERK MIDDLEWARE PATTERN (Next.js 15):
    - Create src/middleware.ts (not app/middleware.ts)
    - Use clerkMiddleware() from @clerk/nextjs/server
    - Protect /dashboard/* routes, allow /, /sign-in, /sign-up as public

    CONVEX SCHEMA TABLES:
    - organizations: { clerkOrgId (indexed), name, createdAt }
    - apps: { orgId (indexed), name, platform, createdAt }
    - apiKeys: { appId (indexed), orgId (indexed), key (indexed), isActive, createdAt }
    - reports: { appId (indexed), orgId (indexed), externalId, title, description,
        severity, category, screenshotAnnotatedId, screenshotOriginalId,
        audioId (optional), audioTranscript (optional), context, customMetadata (optional),
        forwardedIssueUrl (optional), forwardedIssueId (optional), createdAt }
  </context>

  <tasks>
    <task id="task-001" type="auto" linear-id="SHA-6">
      <name>Install Convex and Clerk, create provider wrapper</name>
      <files>
        apps/cloud/package.json,
        apps/cloud/src/components/providers.tsx,
        apps/cloud/src/app/layout.tsx
      </files>
      <action>
        1. Add dependencies to apps/cloud/package.json:
           - convex (latest)
           - @clerk/nextjs (latest)
        2. Run yarn install from monorepo root
        3. Create apps/cloud/src/components/providers.tsx:
           - "use client" directive (providers need client context)
           - Import ConvexProviderWithClerk from "convex/react-clerk"
           - Import ClerkProvider, useAuth from "@clerk/nextjs"
           - Import ConvexReactClient from "convex/react"
           - Create convex client: new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
           - Export Providers component that wraps children in ClerkProvider > ConvexProviderWithClerk
           - Pass useAuth to ConvexProviderWithClerk client prop
        4. Update apps/cloud/src/app/layout.tsx:
           - Import and wrap children with Providers component
           - Keep existing metadata and globals.css import
        5. Add env var guards: if NEXT_PUBLIC_CONVEX_URL is missing, show helpful error
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Convex and Clerk packages installed. Providers.tsx wraps app with ConvexProviderWithClerk. TypeScript compiles.</done>
    </task>

    <task id="task-002" type="auto" linear-id="SHA-6">
      <name>Define Convex schema and auth config</name>
      <files>
        apps/cloud/convex/schema.ts,
        apps/cloud/convex/auth.config.ts,
        apps/cloud/convex/tsconfig.json
      </files>
      <action>
        1. Create apps/cloud/convex/ directory
        2. Create apps/cloud/convex/tsconfig.json:
           - { "compilerOptions": { "allowJs": true, "strict": true } }
           (Convex uses its own TS config for the convex/ directory)
        3. Create apps/cloud/convex/auth.config.ts:
           - Export default auth config with Clerk provider
           - Use the pattern: export default { providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN, applicationID: "convex" }] }
           - Or use the simpler pattern if Convex docs show it
        4. Create apps/cloud/convex/schema.ts with defineSchema and defineTable:
           - organizations table:
             * clerkOrgId: v.string() (indexed)
             * name: v.string()
             * createdAt: v.number()
           - apps table:
             * orgId: v.id("organizations") (indexed)
             * name: v.string()
             * platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web"), v.literal("universal"))
             * createdAt: v.number()
           - apiKeys table:
             * appId: v.id("apps") (indexed)
             * orgId: v.id("organizations") (indexed)
             * key: v.string() (indexed)
             * isActive: v.boolean()
             * createdAt: v.number()
           - reports table:
             * appId: v.id("apps") (indexed)
             * orgId: v.id("organizations") (indexed)
             * externalId: v.string()
             * title: v.string()
             * description: v.string()
             * severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
             * category: v.union(v.literal("bug"), v.literal("ui"), v.literal("crash"), v.literal("performance"), v.literal("other"))
             * screenshotStorageId: v.optional(v.id("_storage"))
             * screenshotOriginalStorageId: v.optional(v.id("_storage"))
             * audioStorageId: v.optional(v.id("_storage"))
             * audioTranscript: v.optional(v.string())
             * context: v.any()
             * customMetadata: v.optional(v.any())
             * forwardedIssueUrl: v.optional(v.string())
             * forwardedIssueId: v.optional(v.string())
             * createdAt: v.number()
        5. Ensure all tables have proper indexes defined
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Convex schema defines organizations, apps, apiKeys, reports tables with proper types and indexes. Auth config references Clerk. TypeScript compiles.</done>
    </task>

    <task id="task-003" type="auto" linear-id="SHA-6">
      <name>Create Clerk middleware and verify full build</name>
      <files>
        apps/cloud/src/middleware.ts
      </files>
      <action>
        1. Create apps/cloud/src/middleware.ts:
           - Import clerkMiddleware, createRouteMatcher from "@clerk/nextjs/server"
           - Define public routes: /, /sign-in(.*), /sign-up(.*), /api/ingest(.*)
           - Use clerkMiddleware with route protection:
             * If route is NOT public, call auth.protect()
           - Export config with matcher excluding static files and internals
        2. Run full verification suite:
           - yarn typecheck (all packages)
           - yarn lint (all packages)
           - yarn test (all tests pass)
           - yarn build (all packages build)
           - Smoke: dev server starts without crashing

        NOTE: If Convex env vars (NEXT_PUBLIC_CONVEX_URL) or Clerk env vars
        (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) are not set,
        the app should still BUILD successfully. Runtime behavior may differ.
        This is acceptable for partial completion mode.
      </action>
      <verify>yarn build &amp;&amp; yarn typecheck</verify>
      <done>Clerk middleware protects /dashboard/* routes. Full monorepo build and typecheck pass. Dev server starts (may show warnings about missing env vars but does not crash).</done>
    </task>
  </tasks>

  <on-complete>
    BEFORE outputting PLAN_COMPLETE, verify:
    □ All task verify commands passed
    □ yarn typecheck passed (exit code 0)
    □ yarn lint passed (exit code 0)
    □ yarn test passed (all existing tests still pass)
    □ yarn build passed (exit code 0)
    □ Smoke: cd apps/cloud and yarn dev starts without crashing

    If Convex/Clerk env vars are missing, app may show runtime warnings but
    MUST NOT crash. Build and typecheck MUST pass regardless.

    If ANY verification fails: FIX and re-verify. Do NOT output PLAN_COMPLETE.
  </on-complete>
</plan>
