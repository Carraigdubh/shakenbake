# ADR-001: Tech Stack for ShakeNbake Cloud

## Status
Accepted

## Date
2026-02-23

## Context
ShakeNbake Cloud is the hosted SaaS version of the bug reporting SDK. It needs auth, real-time data, file storage, and API endpoints for report ingestion.

## Decision
- Next.js 15 (App Router) on Vercel
- Clerk for authentication and organization-based multi-tenancy
- Convex for backend (replaces Postgres+Prisma from original PRD)
- Stripe for billing
- OpenAI Whisper for audio transcription
- Convex file storage for screenshots and attachments

## Consequences

### Positive
- Convex provides real-time subscriptions out of the box (great for live dashboard)
- Convex handles schema, functions, and file storage in one platform
- Clerk + Convex have official integration
- Simpler stack (no ORM, no migration files)

### Negative
- Vendor lock-in to Convex (harder to migrate than Postgres)
- Different from SDK packages which use generic adapters
- Convex pricing model differs from self-hosted Postgres

### Neutral
- Existing SDK packages unaffected (they use DestinationAdapter interface)
- cloud-client package may need updates for Convex-specific endpoints
