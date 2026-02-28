# ShakeNbake Cloud Website

## Vision
Build a hosted SaaS platform for bug reporting at shakenbake.mobi. Teams create workspaces, configure apps, and receive bug reports from ShakeNbake SDK (mobile + web) clients.

## Core Value
Zero-config bug reporting: install SDK, add API key, shake to report.

## Goals
1. Deploy working SaaS at shakenbake.mobi
2. Clerk-based auth with org multi-tenancy
3. Convex backend for real-time data + file storage
4. Report ingestion API for SDK integration
5. Dashboard for viewing and managing bug reports

## Non-Goals
- Stripe billing (P2)
- Audio transcription (P1)
- Linear forwarding (P1)
- Custom self-hosting

## Success Criteria
- Landing page live at shakenbake.mobi
- Users can sign up, create apps, generate API keys
- SDK clients can submit reports via API
- Dashboard shows reports with screenshots and context

## Target User
Development teams using ShakeNbake SDK

## Key Constraints
- Existing Turborepo + Yarn monorepo
- Convex cloud-live mode (production)
- Next.js App Router (not Pages)
