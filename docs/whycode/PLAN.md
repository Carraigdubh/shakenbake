<plan id="03-02" linear-id="SHA-10">
  <name>Apps Management Pages</name>
  <type>frontend</type>
  <phase>3</phase>

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
    <hosting>vercel</hosting>
    <ui>shadcn/ui + tailwindcss v4</ui>
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
    Plans 01-01 through 03-01 are COMPLETE. apps/cloud/ now has:
    - Next.js 15, Tailwind v4, shadcn/ui (Button, Card, Input)
    - Convex schema + functions: organizations, apps (CRUD), apiKeys (generate/list/revoke/validate)
    - Clerk auth pages, dashboard layout with sidebar/header
    - Landing page, report ingestion HTTP endpoint
    - All builds/typechecks/tests pass

    Existing Convex functions to use (in apps/cloud/convex/):
    - apps.ts: createApp, listApps, getApp, deleteApp
    - apiKeys.ts: generateApiKey, listApiKeys, revokeApiKey
    - organizations.ts: ensureOrganization

    Existing components:
    - src/components/ui/: button, card, input (shadcn)
    - src/components/: sidebar, header, dashboard-shell, providers

    Dashboard layout at /dashboard/ with sidebar nav (Apps, Reports links).

    This plan creates the Apps management UI:
    1. Apps list page with create dialog
    2. App detail page with API key management
    3. Delete app with confirmation

    IMPORTANT NOTES:
    - Use Convex React hooks: useQuery, useMutation from "convex/react"
    - Import API references: import { api } from "../../convex/_generated/api"
      The api object has api.apps.listApps, api.apps.createApp, etc.
    - The api.ts stub was created in plan 02-02 - READ it to see available exports
    - For organization context, use ensureOrganization mutation on dashboard load
      or get orgId from Clerk's useOrganization hook
    - Pages under /dashboard/ are client components (need useQuery, useMutation)
    - Add additional shadcn components as needed: dialog, select, badge, dropdown-menu, toast
      Run: cd apps/cloud && npx shadcn@latest add [component]
    - For clipboard copy: use navigator.clipboard.writeText()
    - Tailwind v4 - use standard utility classes
  </context>

  <tasks>
    <task id="task-001" type="auto" linear-id="SHA-10">
      <name>Apps list page with create dialog</name>
      <files>
        apps/cloud/src/app/dashboard/apps/page.tsx,
        apps/cloud/src/components/app-card.tsx
      </files>
      <action>
        1. Install needed shadcn components: dialog, select, badge, label
           cd apps/cloud && npx shadcn@latest add dialog select badge label

        2. Create apps/cloud/src/components/app-card.tsx:
           - "use client"
           - Card showing app name, platform badge, created date
           - Click navigates to /dashboard/apps/[appId]
           - Use shadcn Card, Badge components
           - Platform badge colors: ios=blue, android=green, web=purple, universal=gray

        3. Create apps/cloud/src/app/dashboard/apps/page.tsx:
           - "use client"
           - Use useQuery(api.apps.listApps, { orgId }) to fetch apps
           - Use useMutation(api.apps.createApp) for creating
           - Need orgId: use useOrganization() from @clerk/nextjs or ensureOrganization
           - "Create App" button opens Dialog with:
             * Name input (required)
             * Platform select (ios, android, web, universal)
             * Submit button calls createApp mutation
           - Display apps as card grid using AppCard component
           - Empty state: "No apps yet" with create CTA
           - Loading state while query resolves
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Apps list page shows apps in card grid. Create dialog works. TypeScript compiles.</done>
    </task>

    <task id="task-002" type="auto" linear-id="SHA-10">
      <name>App detail page with API key management</name>
      <files>
        apps/cloud/src/app/dashboard/apps/[appId]/page.tsx,
        apps/cloud/src/components/api-key-display.tsx
      </files>
      <action>
        1. Install needed shadcn components if not already: table, tooltip
           cd apps/cloud && npx shadcn@latest add table tooltip

        2. Create apps/cloud/src/components/api-key-display.tsx:
           - "use client"
           - Shows masked key: "snb_app_****...XXXX"
           - Copy button (copies full key if just generated, otherwise shows masked)
           - Revoke button with confirmation
           - "Just generated" state: shows full key with prominent copy button + warning "This won't be shown again"

        3. Create apps/cloud/src/app/dashboard/apps/[appId]/page.tsx:
           - "use client"
           - Get appId from params
           - useQuery(api.apps.getApp, { appId }) for app details
           - useQuery(api.apiKeys.listApiKeys, { appId }) for keys
           - useMutation(api.apiKeys.generateApiKey) for new keys
           - useMutation(api.apiKeys.revokeApiKey) for revocation
           - App info section: name, platform, created date
           - API Keys section: table of keys with status, created date, actions
           - "Generate New Key" button - on success, show ApiKeyDisplay in "just generated" mode
           - Setup instructions: code snippet showing SDK integration
           - Back link to /dashboard/apps
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>App detail shows info + API keys. Generate shows key once. Revoke works. Setup instructions shown.</done>
    </task>

    <task id="task-003" type="auto" linear-id="SHA-10">
      <name>Delete app with confirmation</name>
      <files>
        apps/cloud/src/app/dashboard/apps/[appId]/page.tsx
      </files>
      <action>
        1. Add "Delete App" section to app detail page:
           - Danger zone area at bottom with red border
           - Delete button (destructive variant)
           - Confirmation dialog: "Are you sure? This will delete the app and all its API keys."
           - On confirm: call deleteApp mutation
           - On success: redirect to /dashboard/apps using useRouter()

        2. Run full verification suite:
           - yarn typecheck
           - yarn lint
           - yarn test
           - yarn build
           - Smoke test: dev server starts
      </action>
      <verify>yarn build &amp;&amp; yarn typecheck</verify>
      <done>Delete app with confirmation dialog. Cascading deletion. Redirect after delete. Full build passes.</done>
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
