<plan id="01-01" linear-id="SHA-5">
  <name>Next.js 15 + Tailwind + shadcn/ui Scaffold</name>
  <type>standard</type>
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
    This is a BROWNFIELD monorepo. The apps/cloud/ directory currently has:
    - A placeholder package.json with echo-only scripts
    - A placeholder page.tsx with "Coming soon" text
    - A tsconfig.json configured for basic React/JSX

    The monorepo root uses:
    - yarn 1.22.22 with workspaces (packages/*, apps/*, examples/*)
    - turbo.json with build/dev/lint/typecheck/test tasks
    - tsconfig.base.json with ES2022 target, strict mode

    Reference: examples/nextjs-app/ has a working Next.js setup in this monorepo
    with transpilePackages and webpack crypto fallback configuration.

    IMPORTANT: The root workspace name in package.json may need to be used for
    filtering turbo builds. Check existing patterns.

    NOTE: When initializing shadcn/ui, you may need to create the components.json
    manually if the interactive CLI doesn't work in this context. Use the shadcn
    docs as reference. Add components individually with npx shadcn@latest add [component].
  </context>

  <tasks>
    <task id="task-001" type="auto" linear-id="SHA-5">
      <name>Initialize Next.js 15 in apps/cloud</name>
      <files>
        apps/cloud/package.json,
        apps/cloud/next.config.ts,
        apps/cloud/tsconfig.json,
        apps/cloud/postcss.config.mjs,
        apps/cloud/tailwind.config.ts,
        apps/cloud/src/app/layout.tsx,
        apps/cloud/src/app/page.tsx,
        apps/cloud/src/app/globals.css
      </files>
      <action>
        1. Replace apps/cloud/package.json:
           - name: "@shakenbake/cloud"
           - Add dependencies: next@^15, react@^19, react-dom@^19, tailwindcss@^4, @tailwindcss/postcss
           - Add devDependencies: typescript, @types/react, @types/react-dom, @types/node, eslint, eslint-config-next
           - Scripts: dev="next dev", build="next build", start="next start", lint="next lint", typecheck="tsc --noEmit"
           - Add @shakenbake/core as workspace dependency

        2. Replace apps/cloud/tsconfig.json with Next.js-compatible config:
           - Use "extends": "../../tsconfig.base.json" if compatible, or fresh Next.js tsconfig
           - Include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
           - Paths: {"@/*": ["./src/*"]}
           - jsx: "preserve", module: "esnext", moduleResolution: "bundler"

        3. Create apps/cloud/next.config.ts:
           - transpilePackages: ["@shakenbake/core"]

        4. Create apps/cloud/postcss.config.mjs for Tailwind v4:
           - Use @tailwindcss/postcss plugin

        5. Create apps/cloud/src/app/globals.css:
           - @import "tailwindcss" for v4
           - Add CSS custom properties for shadcn theme

        6. Update apps/cloud/src/app/layout.tsx:
           - Import globals.css
           - Basic html/body structure with metadata

        7. Update apps/cloud/src/app/page.tsx:
           - Simple "ShakeNbake Cloud" heading with Tailwind classes to verify styling works

        8. Run yarn install from root to link dependencies
      </action>
      <verify>cd apps/cloud &amp;&amp; yarn build</verify>
      <done>Next.js 15 builds successfully. Dev server starts. Tailwind classes render styled content.</done>
    </task>

    <task id="task-002" type="auto" linear-id="SHA-5">
      <name>Install and configure shadcn/ui</name>
      <files>
        apps/cloud/components.json,
        apps/cloud/src/lib/utils.ts,
        apps/cloud/src/components/ui/button.tsx,
        apps/cloud/src/components/ui/card.tsx,
        apps/cloud/src/components/ui/input.tsx
      </files>
      <action>
        1. Install shadcn/ui dependencies: class-variance-authority, clsx, tailwind-merge, lucide-react
        2. Create apps/cloud/src/lib/utils.ts with cn() helper (clsx + tailwind-merge)
        3. Create apps/cloud/components.json for shadcn configuration:
           - style: "new-york"
           - rsc: true
           - tsx: true
           - aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/components/ui", hooks: "@/hooks", lib: "@/lib" }
        4. Add base shadcn components: button, card, input
           - Use npx shadcn@latest add button card input OR create manually from shadcn docs
        5. Verify Button renders in page.tsx with correct styling
      </action>
      <verify>cd apps/cloud &amp;&amp; npx tsc --noEmit</verify>
      <done>shadcn/ui components importable. Button, Card, Input render with Tailwind styling. TypeScript compiles clean.</done>
    </task>

    <task id="task-003" type="auto" linear-id="SHA-5">
      <name>Verify monorepo integration and turbo pipeline</name>
      <files>
        turbo.json,
        apps/cloud/package.json
      </files>
      <action>
        1. Verify turbo.json build outputs include ".next/**" (already configured)
        2. Ensure apps/cloud/package.json has @shakenbake/core dependency
        3. Run full monorepo build: yarn build (turbo run build)
        4. Verify apps/cloud builds in correct dependency order (core first, then cloud)
        5. Test that turbo caching works (second build should be faster)
        6. Ensure yarn typecheck and yarn lint work for apps/cloud
      </action>
      <verify>yarn build &amp;&amp; yarn typecheck</verify>
      <done>Full monorepo build succeeds including cloud app. Typecheck passes across all packages. Turbo pipeline respects dependency order.</done>
    </task>
  </tasks>

  <on-complete>
    BEFORE outputting PLAN_COMPLETE, verify:
    □ All task verify commands passed
    □ yarn typecheck passed (exit code 0)
    □ yarn lint passed (exit code 0)
    □ yarn test passed (all existing tests still pass)
    □ yarn build passed (exit code 0)
    □ Smoke: cd apps/cloud && yarn dev starts Next.js without crashing

    If ANY failed: FIX and re-verify. Do NOT output PLAN_COMPLETE.
  </on-complete>
</plan>
