# ShakeNbake Cloud Architecture

## Overview
ShakeNbake Cloud is a Next.js 15 App Router application using Clerk for auth, Convex for backend (cloud-live), deployed to Vercel at shakenbake.mobi.

## Architecture Pattern: Balanced
Pragmatic approach: Convex provides schema, functions, file storage, and real-time subscriptions in one platform. Clerk handles auth UI and multi-tenancy. Next.js App Router for SSR/SSG where possible.

## Directory Structure
```
apps/cloud/
  convex/               # Convex backend (deployed separately)
    schema.ts           # Table definitions
    auth.config.ts      # Clerk integration
    organizations.ts    # Org sync functions
    apps.ts             # App CRUD
    apiKeys.ts          # API key management
    reports.ts          # Report ingestion + queries
    http.ts             # HTTP router for public API
  src/
    app/
      layout.tsx        # Root layout with providers
      page.tsx          # Landing page
      sign-in/          # Clerk sign-in
      sign-up/          # Clerk sign-up
      dashboard/
        layout.tsx      # Dashboard shell (sidebar + header)
        page.tsx        # Overview
        apps/           # App management
        reports/        # Report browsing
    components/
      providers.tsx     # ConvexClerkProvider
      sidebar.tsx       # Navigation
      header.tsx        # Org switcher + user
      ui/               # shadcn/ui components
    lib/
      utils.ts          # Utilities
    middleware.ts       # Clerk auth middleware
```

## Data Flow
1. SDK sends POST to Convex HTTP endpoint with API key
2. HTTP action validates key, stores files, creates report record
3. Dashboard queries reports via Convex real-time subscriptions
4. Clerk manages auth, Convex enforces org-scoped data isolation

## Security
- API keys scoped to org (snb_app_ prefix)
- All Convex functions enforce org ownership via ctx.auth
- Clerk middleware protects /dashboard/* routes
- HTTP ingestion validates API keys before any data access
