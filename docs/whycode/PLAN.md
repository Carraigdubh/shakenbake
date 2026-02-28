<plan id="03-03" linear-id="SHA-11">
  <name>Reports Pages</name>
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
    Plans 01-01 through 03-02 are COMPLETE. apps/cloud/ now has:
    - Next.js 15, Tailwind v4, shadcn/ui (Button, Card, Input, Dialog, Select, Badge, Label, Table, Tooltip)
    - Convex schema + functions: organizations, apps (CRUD), apiKeys (generate/list/revoke/validate), reports (ingest/list/get/counts)
    - Clerk auth pages, dashboard layout with sidebar/header
    - Landing page, report ingestion HTTP endpoint
    - Apps management pages: list with create dialog, detail with API keys, delete with confirmation
    - All builds/typechecks/tests pass

    Existing Convex functions for reports (in apps/cloud/convex/reports.ts):
    - listReports({ orgId, appId?, severity?, paginationOpts }) — paginated, ordered desc
    - getReport({ reportId }) — returns report with resolved storage URLs (screenshotUrl, screenshotOriginalUrl, audioUrl)
    - getReportCounts({ orgId }) — returns { total, low, medium, high, critical }

    Other Convex functions available:
    - apps.ts: listApps({ orgId }) — for app filter dropdown
    - organizations.ts: getOrganization({ clerkOrgId }) — to resolve Clerk org to Convex org

    Existing components (src/components/):
    - ui/: button, card, input, dialog, select, badge, label, table, tooltip
    - app-card.tsx, api-key-display.tsx, sidebar.tsx, header.tsx, dashboard-shell.tsx, providers.tsx

    Dashboard layout at /dashboard/ with sidebar nav (Apps, Reports links).

    This plan creates the Reports viewing UI:
    1. Reports list page with filters (app, severity) and pagination
    2. Report detail page with screenshot viewer, audio player, context data
    3. Dashboard overview with report count summary cards

    IMPORTANT NOTES:
    - Use Convex React hooks: useQuery, useMutation from "convex/react"
    - Import API references: import { api } from "../../convex/_generated/api" (adjust depth)
    - For pagination with Convex: use usePaginatedQuery from "convex/react"
      Usage: const { results, status, loadMore } = usePaginatedQuery(api.reports.listReports, args, { initialNumItems: 25 })
    - Pages under /dashboard/ are client components (need "use client")
    - The listReports function uses paginationOptsValidator — pass { numItems: 25, cursor: null } for initial
    - Screenshots/audio come as URLs from getReport — use <img> and <audio> tags
    - Severity colors: low=green, medium=yellow, high=orange, critical=red
    - Category badges: bug, ui, crash, performance, other
    - Next.js 15: params in dynamic routes is a Promise - use React.use(params) to unwrap
    - For org context: useOrganization() → getOrganization({ clerkOrgId }) → orgId
    - Follow existing page patterns from apps/page.tsx (loading, empty, org-select states)
  </context>

  <tasks>
    <task id="task-001" type="auto" linear-id="SHA-11">
      <name>Reports list page with filters and pagination</name>
      <files>
        apps/cloud/src/app/dashboard/reports/page.tsx,
        apps/cloud/src/components/report-row.tsx
      </files>
      <action>
        1. Create apps/cloud/src/components/report-row.tsx:
           - "use client"
           - Table row showing: title, app name, severity badge, category badge, date
           - Click navigates to /dashboard/reports/[reportId]
           - Severity badge colors: low=green, medium=yellow, high=orange, critical=red
           - Category as secondary badge

        2. Create apps/cloud/src/app/dashboard/reports/page.tsx:
           - "use client"
           - Use usePaginatedQuery(api.reports.listReports, { orgId, appId?, severity? }, { initialNumItems: 25 })
           - Use useQuery(api.apps.listApps, { orgId }) for app filter dropdown
           - Filter bar: app dropdown (Select), severity dropdown (Select)
           - Results table with ReportRow components
           - "Load more" button when status === "CanLoadMore"
           - Empty state: "No reports yet" with description about SDK integration
           - Loading state with spinner
           - Handle no-org state: "Select an organization" prompt
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Reports list page shows paginated reports with app/severity filters. TypeScript compiles.</done>
    </task>

    <task id="task-002" type="auto" linear-id="SHA-11">
      <name>Report detail page with media viewers</name>
      <files>
        apps/cloud/src/app/dashboard/reports/[reportId]/page.tsx
      </files>
      <action>
        1. Create apps/cloud/src/app/dashboard/reports/[reportId]/page.tsx:
           - "use client"
           - Get reportId from params (React.use(params))
           - useQuery(api.reports.getReport, { reportId }) for full report with URLs
           - Report header: title, severity badge, category badge, date
           - Screenshot section: if screenshotUrl, show image in Card
             * Click to view original (screenshotOriginalUrl) in new tab or modal
             * If no screenshot, show placeholder
           - Audio section: if audioUrl, show HTML5 audio player
             * If audioTranscript exists, show transcript text below
           - Context data section: render report.context as formatted JSON in a code block
           - Custom metadata section: if customMetadata, render as formatted JSON
           - Forwarded issue link: if forwardedIssueUrl, show link badge
           - Back link to /dashboard/reports
           - Loading state and not-found state
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Report detail shows all fields: screenshot, audio, context, metadata. Loading/not-found states work.</done>
    </task>

    <task id="task-003" type="auto" linear-id="SHA-11">
      <name>Dashboard overview with report counts</name>
      <files>
        apps/cloud/src/app/dashboard/page.tsx
      </files>
      <action>
        1. Update apps/cloud/src/app/dashboard/page.tsx:
           - "use client"
           - Get org context using useOrganization() + getOrganization
           - Use useQuery(api.reports.getReportCounts, { orgId }) for counts
           - Use useQuery(api.apps.listApps, { orgId }) for app count
           - Summary cards grid:
             * Total Reports (total count)
             * Critical (critical count, red accent)
             * High (high count, orange accent)
             * Apps (number of apps)
           - Quick links section: "View all reports", "Manage apps"
           - Welcome message when no data yet
           - Loading state

        2. Run full verification suite:
           - yarn typecheck
           - yarn lint
           - yarn test
           - yarn build
           - Smoke test: dev server starts
      </action>
      <verify>yarn build &amp;&amp; yarn typecheck</verify>
      <done>Dashboard shows report summary cards. Full build passes with all reports pages.</done>
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
