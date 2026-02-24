# Architecture Overview

## Monorepo Layout
```
packages/
  core/          # Platform-agnostic types & interfaces (BUILT)
  linear/        # Linear GraphQL adapter (BUILT)
  web/           # Web SDK (BUILT)
  react-native/  # Mobile SDK (BUILT)
  cloud-client/  # Cloud client SDK (BUILT)
apps/
  cloud/         # ShakeNbake Cloud SaaS (TO BUILD)
examples/
  expo-app/      # Example Expo app
  nextjs-app/    # Example Next.js app
```

## Cloud App Architecture (Planned)
```
apps/cloud/
  convex/              # Convex schema, functions, auth
  src/
    app/               # Next.js App Router pages
      (marketing)/     # Landing pages
      dashboard/       # Authenticated dashboard
      api/             # API routes (report ingestion)
    components/        # React components
    lib/               # Utilities, Convex client
  public/              # Static assets
```

## Data Flow
SDK -> POST /api/reports (with API key) -> Convex stores report -> Dashboard shows reports -> Async: Whisper transcription -> Forward to Linear
