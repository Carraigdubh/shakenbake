## Task: Create LinearAdapter class implementing DestinationAdapter
## Status: Complete

### What Was Implemented
- Created `LinearConfig` interface in `packages/linear/src/types.ts` with all configuration options (apiKey, teamId, projectId, defaultLabelIds, defaultAssigneeId, defaultPriority, severityMapping, categoryLabels, apiUrl)
- Created `LinearAdapter` class in `packages/linear/src/adapter.ts` implementing the `DestinationAdapter` interface from `@shakenbake/core`
- `name` property returns `'linear'`
- Exported all types and the adapter class from `packages/linear/src/index.ts`

### Files Created/Modified
- `packages/linear/src/types.ts` - Created LinearConfig type and defaults
- `packages/linear/src/adapter.ts` - Created LinearAdapter class
- `packages/linear/src/index.ts` - Updated exports

### Decisions Made
- Default severity mapping: critical=1, high=2, medium=3, low=4 (matches Linear priority scale)
- Default API URL: https://api.linear.app/graphql
