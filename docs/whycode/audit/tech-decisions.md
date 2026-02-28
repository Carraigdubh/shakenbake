# Tech Stack Decisions

## Date: 2026-02-23

## Decisions
| Category | Choice | Rationale |
|----------|--------|-----------|
| Package Manager | Yarn 1.22.22 | Existing monorepo uses yarn workspaces |
| Framework | Next.js 15 (App Router) | User specified, Vercel-optimized |
| Auth | Clerk | User specified, org-based multi-tenancy |
| Database/Backend | Convex (cloud-live) | User specified, replaces PRD's Postgres+Prisma |
| Hosting | Vercel | User specified, domain shakenbake.mobi |
| Monorepo | Turborepo | Already in use |
| Testing | Vitest | Already in use across packages |
| Billing | Stripe | From PRD specification |
| Transcription | OpenAI Whisper | From PRD specification |
| File Storage | Convex file storage | Convex native, simpler than Vercel Blob |

## Architectural Change from PRD
The PRD specifies Postgres via Neon/Supabase with Prisma or Drizzle.
User explicitly chose Convex as the backend. This is an IMMUTABLE DECISION.
