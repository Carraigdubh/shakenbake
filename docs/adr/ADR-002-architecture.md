# ADR-002: Balanced Architecture for ShakeNbake Cloud

## Status
Accepted

## Date
2026-02-23

## Context
Need to design the Cloud app architecture that supports multi-tenant bug report storage, real-time dashboards, and SDK report ingestion.

## Decision
Balanced architecture using:
- Convex for full backend (schema, functions, file storage, real-time)
- Clerk + Convex official integration for auth
- Next.js App Router with server/client component split
- shadcn/ui + Tailwind for UI primitives
- Convex HTTP actions for public API (SDK ingestion)

## Consequences
### Positive
- Single backend platform (Convex) reduces operational complexity
- Real-time subscriptions out of the box
- Strong type safety (Convex schema -> TypeScript types)
- Clerk integration well-documented and maintained

### Negative
- Convex vendor lock-in
- HTTP action limitations vs traditional REST API

### Neutral
- 8 implementation plans with clear dependency graph
- MVP-focused: P1/P2 features deferred
