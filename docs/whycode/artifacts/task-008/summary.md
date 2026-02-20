## Task: Implement issueCreate via GraphQL
## Status: Complete

### What Was Implemented
- Created `packages/linear/src/graphql.ts` with GraphQL queries/mutations and `linearFetch` wrapper
- Implemented `createIssue()` method in LinearAdapter that uploads screenshots, builds markdown, and creates Linear issues
- Created `packages/linear/src/markdown.ts` with `buildIssueDescription()` for generating structured markdown from BugReport
- Authorization header uses API key directly (no Bearer prefix) per Linear API spec
- Severity-to-priority mapping with configurable defaults
- Label ID merging from defaults + category labels
- Graceful fallback when screenshot upload fails

### Files Created/Modified
- `packages/linear/src/graphql.ts` - GraphQL constants and linearFetch wrapper
- `packages/linear/src/markdown.ts` - Markdown description builder
- `packages/linear/src/adapter.ts` - Full createIssue implementation

### Decisions Made
- No Bearer prefix on Authorization header (per Linear API discovery)
- Screenshots gracefully fall back if upload fails (issue still created without images)
- Markdown includes collapsible device context and last 5 console errors
