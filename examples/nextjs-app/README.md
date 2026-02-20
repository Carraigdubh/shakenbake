# ShakeNbake Next.js Example

Minimal Next.js 15 app demonstrating `@shakenbake/web` with a server-side proxy for Linear integration.

## Prerequisites

- Node.js 20+
- yarn 1.x (workspace-managed from monorepo root)
- A Linear account with an API key

## Setup

1. Install dependencies from the **monorepo root** (not from this directory):

   ```bash
   cd ../..
   yarn install
   ```

2. Copy the environment file and fill in your Linear credentials:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   ```
   LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
   LINEAR_TEAM_ID=your-team-uuid
   ```

3. Build the SDK packages first:

   ```bash
   # From monorepo root
   yarn build
   ```

4. Start the dev server:

   ```bash
   # From monorepo root
   yarn workspace nextjs-example dev
   ```

   Or from this directory:

   ```bash
   yarn dev
   ```

   The app will be available at `http://localhost:3000`.

## How to Trigger a Bug Report

- **Keyboard shortcut**: Press `Cmd+Shift+K` (macOS) or `Ctrl+Shift+K` (Windows/Linux)
- **FAB button**: Click the floating bug button in the bottom-right corner

## What Happens

1. A screenshot of the current page is captured via html2canvas
2. An annotation overlay opens where you can draw, highlight, and add arrows
3. A report form appears pre-filled with browser context (user agent, screen size, network, etc.)
4. On submit, the report is sent to `/api/shakenbake` which creates a Linear issue server-side

## Architecture

- `app/layout.tsx` — Root layout with metadata (Server Component)
- `app/providers.tsx` — Client Component wrapping children in `ShakeNbakeProvider` with `ProxyAdapter`
- `app/page.tsx` — Sample page content (Server Component)
- `app/api/shakenbake/route.ts` — Next.js Route Handler that proxies requests to Linear, keeping the API key server-side
