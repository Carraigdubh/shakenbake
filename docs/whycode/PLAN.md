<plan id="03-01" linear-id="SHA-9">
  <name>Auth Pages + Dashboard Layout</name>
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
    Plans 01-01, 01-02, and 02-01 are COMPLETE. apps/cloud/ now has:
    - Working Next.js 15 with React 19, Tailwind v4, shadcn/ui (Button, Card, Input)
    - Convex with schema (organizations, apps, apiKeys, reports)
    - Convex functions: organizations.ts, apps.ts, apiKeys.ts
    - Clerk middleware protecting /dashboard/* routes
    - ConvexProviderWithClerk wrapping the app
    - All builds, typechecks, tests pass

    Existing components in apps/cloud/src/components/ui/:
    - button.tsx, card.tsx, input.tsx (shadcn/ui)

    Existing files:
    - src/app/layout.tsx (root layout with Providers)
    - src/app/page.tsx (placeholder with Card/Button)
    - src/components/providers.tsx (ConvexProviderWithClerk)
    - src/middleware.ts (Clerk middleware)
    - src/lib/utils.ts (cn helper)

    This plan creates:
    1. Clerk auth pages (sign-in, sign-up) using Clerk's hosted UI components
    2. Dashboard layout with sidebar navigation and header with org switcher
    3. Marketing landing page

    IMPORTANT NOTES:
    - Use @clerk/nextjs components: SignIn, SignUp, OrganizationSwitcher, UserButton
    - Clerk auth pages use catch-all routes: sign-in/[[...sign-in]]/page.tsx
    - Dashboard layout should be a nested layout under /dashboard/
    - The sidebar should have nav links to: Apps (/dashboard/apps), Reports (/dashboard/reports)
    - Header should have OrganizationSwitcher and UserButton from Clerk
    - Landing page is a server component (no client JS needed)
    - Use existing shadcn components (Button, Card) plus add any needed ones
    - Install additional shadcn components if needed: npx shadcn@latest add [component]
    - The landing page should have a professional look - hero, features, pricing preview
    - For env vars not being set (Clerk keys), the build should still succeed
    - Tailwind v4 uses @import "tailwindcss" - NOT the v3 @tailwind directives
    - The globals.css already has shadcn CSS custom properties defined
  </context>

  <tasks>
    <task id="task-001" type="auto" linear-id="SHA-9">
      <name>Clerk auth pages</name>
      <files>
        apps/cloud/src/app/sign-in/[[...sign-in]]/page.tsx,
        apps/cloud/src/app/sign-up/[[...sign-up]]/page.tsx
      </files>
      <action>
        1. Create apps/cloud/src/app/sign-in/[[...sign-in]]/page.tsx:
           - Import { SignIn } from "@clerk/nextjs"
           - Center the SignIn component on the page
           - Use a clean layout: flex center, min-h-screen
           - Add afterSignInUrl="/dashboard" or routing config

        2. Create apps/cloud/src/app/sign-up/[[...sign-up]]/page.tsx:
           - Import { SignUp } from "@clerk/nextjs"
           - Same centered layout
           - Add afterSignUpUrl="/dashboard" or routing config

        Both pages should be simple and clean.
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Sign-in and sign-up pages render Clerk UI components. TypeScript compiles.</done>
    </task>

    <task id="task-002" type="auto" linear-id="SHA-9">
      <name>Dashboard layout with sidebar and header</name>
      <files>
        apps/cloud/src/app/dashboard/layout.tsx,
        apps/cloud/src/app/dashboard/page.tsx,
        apps/cloud/src/components/sidebar.tsx,
        apps/cloud/src/components/header.tsx
      </files>
      <action>
        1. Create apps/cloud/src/components/sidebar.tsx:
           - "use client" (needs usePathname for active link)
           - Navigation links: Dashboard (/dashboard), Apps (/dashboard/apps), Reports (/dashboard/reports)
           - Use icons from lucide-react: LayoutDashboard, AppWindow, Bug
           - Active link highlighting based on current path
           - Clean design with border-right separator
           - Fixed width (e.g., w-64) on desktop, hidden on mobile

        2. Create apps/cloud/src/components/header.tsx:
           - "use client" (needs Clerk components)
           - Import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
           - Layout: flex between with org switcher on left, user button on right
           - Mobile menu button (hamburger) to toggle sidebar on small screens
           - Clean border-bottom separator

        3. Create apps/cloud/src/app/dashboard/layout.tsx:
           - Import Sidebar and Header components
           - Layout structure: sidebar on left, main content area on right
           - Header at top of content area
           - Responsive: sidebar hidden on mobile, shown on desktop
           - Use Tailwind for responsive layout (lg:flex, etc.)
           - This is a client component if it manages sidebar toggle state,
             OR use a server layout with client sidebar/header components

        4. Create apps/cloud/src/app/dashboard/page.tsx:
           - Simple placeholder: "Welcome to ShakeNbake Cloud"
           - Show a Card with brief instructions
           - This will be replaced with the full overview in plan 03-03
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>Dashboard layout renders with sidebar and header. Navigation works. Org switcher and user button positioned correctly. Responsive layout.</done>
    </task>

    <task id="task-003" type="auto" linear-id="SHA-9">
      <name>Marketing landing page</name>
      <files>
        apps/cloud/src/app/page.tsx
      </files>
      <action>
        1. Replace apps/cloud/src/app/page.tsx with a marketing landing page:
           - This is a SERVER component (no "use client")
           - Hero section:
             * Headline: "Bug Reporting That Just Works"
             * Subheadline: "Shake your device, capture a screenshot, annotate it, and submit. ShakeNbake handles the rest."
             * CTA buttons: "Get Started" (link to /sign-up), "Learn More" (anchor to features)
           - Features section (4 cards using shadcn Card):
             * Screenshot Capture: "One shake captures everything"
             * Annotation Tools: "Draw, highlight, and mark up screenshots"
             * Device Context: "Automatically collects device info, network, battery, and more"
             * Linear Integration: "Bug reports become Linear issues instantly"
           - How It Works section (3 steps):
             * 1. Install SDK  2. Configure API key  3. Shake to report
           - Pricing preview:
             * "$10/month per workspace" with feature list
           - Footer with links

        2. Use Tailwind for all styling, shadcn Button and Card components
        3. Use lucide-react icons for feature cards
        4. Import Link from "next/link" for navigation

        5. Run full verification: yarn build && yarn typecheck && yarn lint
      </action>
      <verify>yarn build &amp;&amp; yarn typecheck</verify>
      <done>Landing page renders with hero, features, pricing. All server components. Build and typecheck pass. Dev server starts without crashing.</done>
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
