// ---------------------------------------------------------------------------
// @shakenbake/linear — Public API
// ---------------------------------------------------------------------------

// Adapter
export { LinearAdapter } from './adapter.js';

// Types
export type { LinearConfig } from './types.js';
export { DEFAULT_SEVERITY_MAPPING, DEFAULT_API_URL } from './types.js';

// GraphQL (exported for advanced use / testing)
export {
  linearFetch,
  requestUploadUrl,
  VIEWER_QUERY,
  ISSUE_CREATE_MUTATION,
  FILE_UPLOAD_MUTATION,
} from './graphql.js';
export type {
  GraphQLResponse,
  ViewerData,
  IssueCreateData,
  FileUploadData,
  FileUploadHeader,
  UploadUrlResult,
} from './graphql.js';

// Markdown builder (exported for customization)
export { buildIssueDescription } from './markdown.js';
