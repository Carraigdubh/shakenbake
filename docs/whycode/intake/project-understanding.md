# Project Understanding: ShakeNbake Cloud Website

## Vision
Build the ShakeNbake Cloud SaaS platform - a hosted bug reporting service that receives reports from the ShakeNbake SDK (mobile + web), stores them, and forwards them to Linear.

## Goals
1. Deploy a working SaaS at shakenbake.mobi on Vercel
2. Clerk-based auth with org-scoped multi-tenancy (workspaces)
3. Convex backend for real-time data, file storage, and functions
4. Report ingestion API for SDK integration
5. Dashboard for viewing and managing bug reports

## MVP Features (P0)
- Landing page with sign-up CTA
- Clerk auth (sign-up, sign-in, org creation)
- App management (create apps, generate API keys)
- Report ingestion endpoint (POST with API key auth)
- Report list + detail view (screenshot, context, annotations)
- Basic dashboard layout

## P1 Features
- Audio transcription (OpenAI Whisper)
- Linear issue forwarding
- Team member management (Clerk orgs)

## P2 Features
- Stripe billing ($10/mo per workspace)
- Workspace settings
- Usage analytics

## Technical Constraints
- Must work within existing Turborepo + Yarn monorepo
- Must use Next.js App Router (not Pages Router)
- Convex in cloud-live mode (production)
- Domain: shakenbake.mobi

## Integrations
- Clerk (auth)
- Convex (backend/db/storage)
- Vercel (hosting)
- Linear API (issue forwarding)
- OpenAI Whisper API (transcription)
- Stripe (billing)
