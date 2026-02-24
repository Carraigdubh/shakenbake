# Project Understanding: ShakeNbake Cloud Website

## Vision
Build the ShakeNbake Cloud hosted SaaS platform — a multi-tenant dashboard and API for managed bug reporting. Users deploy the ShakeNbake SDK, and Cloud handles report ingestion, audio transcription, and issue tracker forwarding.

## Goals
1. Launch the ShakeNbake Cloud website at shakenbake.mobi
2. Multi-tenant workspace management with Clerk auth
3. Report ingestion API for the cloud-client SDK
4. Dashboard for viewing/managing bug reports, apps, and team
5. Server-side audio transcription via OpenAI Whisper
6. Issue tracker forwarding (Linear first)
7. Stripe billing ($10/mo per workspace)

## Features (Prioritized)
### P0 - MVP Launch
- Clerk auth (sign-up, sign-in, organization/workspace management)
- App management (create apps, generate scoped API keys)
- Report ingestion API (POST /api/reports)
- Report viewer dashboard (list + detail view with screenshot, annotations, context)
- Landing/marketing page

### P1 - Core Value
- Audio transcription (Whisper integration)
- Issue tracker forwarding (Linear)
- Team management (invite, roles)

### P2 - Monetization
- Stripe billing integration
- Workspace settings page

## Technical Constraints
- Monorepo already uses Yarn workspaces + Turborepo
- Must integrate with existing @shakenbake/core types and @shakenbake/cloud-client SDK
- Next.js App Router (not Pages Router)
- Convex for backend (USER DECISION - replaces Postgres+Prisma from original PRD)
- Clerk for auth with multi-tenancy via organizations
- Deploy to Vercel at shakenbake.mobi
- Convex deployment mode: cloud-live (production)

## Integrations Required
- Clerk (auth + organizations)
- Convex (database + backend functions)
- Vercel (hosting + deployment)
- Vercel Blob (file storage for screenshots/audio)
- OpenAI Whisper (audio transcription)
- Linear API (issue forwarding)
- Stripe (billing)

## Architecture Change Note
The original PRD specifies Postgres via Neon/Supabase with Prisma or Drizzle. The user has explicitly chosen Convex instead. This is an immutable decision per WhyCode protocol. Convex replaces Postgres+ORM for all database, real-time, and backend function needs.
