# Feature: Linear Adapter (@shakenbake/linear)

## Status: Planning

## Overview

The Linear adapter implements the `DestinationAdapter` interface from `@shakenbake/core` and uses Linear's GraphQL API to create issues with attached screenshots, audio files, and full device context. It is the first destination adapter built and is required for end-to-end testing of the SDK.

The adapter supports two authentication modes (API key and OAuth2), maps ShakeNbake severity/category to Linear priority/labels, and formats bug reports into well-structured Markdown issues with collapsible device context sections.

For web deployments, a server-side proxy pattern is recommended to keep the Linear API key off the client bundle.

## User Story

As a developer using ShakeNbake, I want bug reports to be automatically created as Linear issues with annotated screenshots, device context, and console errors so that my team can triage and fix bugs without asking follow-up questions.

As a developer deploying to production, I want to use a server-side proxy so that my Linear API key is never exposed in client-side code.

## Acceptance Criteria

### DestinationAdapter Implementation

- [ ] `LinearAdapter` class implements the `DestinationAdapter` interface from `@shakenbake/core`
- [ ] `name` property returns `'linear'`
- [ ] Constructor accepts `LinearAdapterConfig`:
  ```typescript
  interface LinearAdapterConfig {
    apiKey: string;                              // Linear personal API key or OAuth token
    teamId: string;                              // Required: which team to create issues in
    projectId?: string;                          // Optional: assign to a project
    defaultLabelIds?: string[];                  // Optional: auto-apply labels
    defaultAssigneeId?: string;                  // Optional: auto-assign
    defaultPriority?: 0 | 1 | 2 | 3 | 4;       // Optional: 0=none, 1=urgent, 2=high, 3=medium, 4=low
    severityMapping?: {                          // Map ShakeNbake severity to Linear priority
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    categoryLabels?: {                           // Map ShakeNbake category to Linear label IDs
      bug?: string;
      ui?: string;
      crash?: string;
      performance?: string;
      other?: string;
    };
  }
  ```

### Image Upload

- [ ] `uploadImage(imageData: Buffer | Blob, filename: string): Promise<string>` is implemented
- [ ] Uses Linear's two-step upload flow:
  1. Call `fileUpload` GraphQL mutation to get a signed upload URL and asset URL
  2. PUT the image data to the signed URL
  3. Return the `assetUrl` for embedding in the issue
- [ ] Supports both `Buffer` (Node.js / server proxy) and `Blob` (browser) image data
- [ ] Handles upload failures by throwing `ShakeNbakeError` with code `UPLOAD_FAILED`
- [ ] Uses appropriate Content-Type header for the image

### Issue Creation

- [ ] `createIssue(report: BugReport): Promise<{ url: string; id: string }>` is implemented
- [ ] Uploads annotated screenshot via `uploadImage()`
- [ ] Uploads original screenshot via `uploadImage()` for comparison
- [ ] Uploads audio file (if present) via `uploadImage()` (same flow)
- [ ] Creates issue via `issueCreate` GraphQL mutation with:
  - `title`: User-provided title from report
  - `description`: Formatted Markdown body (see template below)
  - `teamId`: From config
  - `projectId`: From config (if provided)
  - `labelIds`: Merged from `defaultLabelIds` + `categoryLabels[report.category]`
  - `assigneeId`: From config (if provided)
  - `priority`: Mapped from `report.severity` via `severityMapping`, or `defaultPriority`
- [ ] Returns `{ url, id }` from the created issue
- [ ] Throws `ShakeNbakeError` with appropriate code on failure

### Issue Description Markdown Template

- [ ] Issue description follows this template:
  ```markdown
  ## Bug Report

  {user_description}

  {audio_transcript_if_available}

  ### Screenshots

  **Annotated:**
  ![Annotated screenshot]({annotated_screenshot_url})

  **Original:**
  ![Original screenshot]({original_screenshot_url})

  {audio_attachment_link_if_available}

  ### Device Context

  <details>
  <summary>Full device and environment details</summary>

  | Field | Value |
  |---|---|
  | Platform | {platform.os} {platform.osVersion} |
  | Device | {device.manufacturer} {device.model} |
  | Screen | {screen.width}x{screen.height} @{screen.scale}x |
  | Network | {network.type} ({network.effectiveType}) |
  | Battery | {battery.level}% ({battery.state}) |
  | Locale | {locale.languageCode}-{locale.regionCode} |
  | Timezone | {locale.timezone} |
  | App Version | {app.version} ({app.buildNumber}) |
  | Current Route | {navigation.currentRoute} |

  </details>

  ### Console Errors (last 5)

  {formatted_recent_errors}

  ---
  *Reported via [ShakeNbake](https://github.com/user/shakenbake)*
  ```
- [ ] Missing context fields are gracefully omitted (not shown as "undefined")
- [ ] Console errors are formatted as code blocks

### Connection Testing

- [ ] `testConnection(): Promise<boolean>` is implemented
- [ ] Makes a lightweight GraphQL query to verify credentials (e.g., fetch the authenticated user or team)
- [ ] Returns `true` if credentials are valid
- [ ] Returns `false` (does NOT throw) if credentials are invalid, per the error handling contract

### Rate Limiting

- [ ] Enforces a minimum 1-second delay between consecutive API calls to Linear
- [ ] Throws `ShakeNbakeError` with code `RATE_LIMITED` if Linear returns a 429 response
- [ ] `RATE_LIMITED` errors are marked as `retryable: true`

### Error Handling

- [ ] All API failures throw typed `ShakeNbakeError`:
  - HTTP 401/403 -> `AUTH_FAILED` (retryable: false)
  - HTTP 429 -> `RATE_LIMITED` (retryable: true)
  - Image upload failure -> `UPLOAD_FAILED` (retryable: true)
  - Network/fetch failure -> `NETWORK_ERROR` (retryable: true)
- [ ] `originalError` is preserved on all `ShakeNbakeError` instances
- [ ] If screenshot upload fails, the adapter falls back to embedding the base64 image data directly in the issue description

### Server-Side Proxy Support

- [ ] The adapter works both client-side (direct API calls) and server-side (in a Next.js API route or Express handler)
- [ ] `ProxyAdapter` class is provided in `@shakenbake/web/adapters` (not in this package) for the client-side proxy pattern
- [ ] Documentation explains the recommended proxy pattern for web deployments

### GraphQL Mutations

- [ ] `fileUpload` mutation for getting signed upload URLs:
  ```graphql
  mutation FileUpload($size: Int!, $contentType: String!, $filename: String!) {
    fileUpload(size: $size, contentType: $contentType, filename: $filename) {
      uploadFile {
        uploadUrl
        assetUrl
      }
    }
  }
  ```
- [ ] `issueCreate` mutation for creating issues:
  ```graphql
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        url
      }
    }
  }
  ```

## Technical Approach

### Package Structure

```
packages/linear/
  src/
    adapter.ts     # LinearAdapter class implementing DestinationAdapter
    graphql.ts     # GraphQL mutation strings and fetch wrapper
    config.ts      # LinearAdapterConfig type and defaults
    markdown.ts    # Issue description template formatting
    index.ts       # Public API exports
  package.json
  tsconfig.json
```

### API Communication

- Uses `fetch` (no external GraphQL client dependency) to call Linear's GraphQL API at `https://api.linear.app/graphql`
- Authorization via `Authorization: Bearer {apiKey}` header
- Content-Type: `application/json` for GraphQL, appropriate MIME type for file uploads
- Two-step file upload: mutation to get signed URL, then PUT to that URL

### Key Design Decisions

- No dependency on `graphql-request` or any GraphQL client library -- plain `fetch` keeps the bundle small
- Rate limiting is implemented via a simple timestamp-based throttle (track last call time, delay if < 1s)
- The severity-to-priority mapping is fully configurable with sensible defaults (critical=1/urgent, high=2, medium=3, low=4)
- The Markdown template gracefully handles missing fields so it works for both RN and web contexts

## Dependencies

- `@shakenbake/core` (peer dependency -- for types and interfaces)
- No external runtime dependencies (uses native `fetch`)

## Tasks
