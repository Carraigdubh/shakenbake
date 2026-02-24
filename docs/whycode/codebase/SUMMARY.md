# Codebase Summary

## Monorepo Structure
Turborepo + Yarn workspaces monorepo with SDK packages and apps.

## Existing Packages (Built)
- `@shakenbake/core` v0.0.3 - Plugin system types, interfaces (TriggerPlugin, CapturePlugin, ContextCollector, DestinationAdapter), report builder, mock adapter, error types
- `@shakenbake/linear` v0.0.2 - Linear GraphQL adapter (depends on core)
- `@shakenbake/web` v0.0.2 - Web SDK with html2canvas (depends on core)
- `@shakenbake/react-native` v0.0.3 - Mobile SDK with Skia (depends on core)
- `@shakenbake/cloud-client` v0.0.1 - Client SDK for Cloud

## apps/cloud Status
Placeholder only. Contains a single page.tsx with "Coming soon" text. No Next.js, no Clerk, no database, no API routes.

## Key Files
- Root: package.json (yarn workspaces), turbo.json, tsconfig.base.json
- Package manager: yarn@1.22.22
- Node engine: >=20.0.0
- TypeScript: strict mode, ES2022 target
