# ShakeNbake - API Specification

## Overview

ShakeNbake provides two API layers:

1. **JavaScript/TypeScript SDK API** — Imported into applications
2. **Server-side HTTP API** — Optional proxy endpoint (web applications)

## JavaScript SDK API

### Core Exports

#### @shakenbake/core

```typescript
// Plugin interfaces
export interface TriggerPlugin { ... }
export interface CapturePlugin { ... }
export interface ContextCollector { ... }
export interface DestinationAdapter { ... }

// Main types
export interface ShakeNbakeConfig { ... }
export interface BugReport { ... }
export interface ReportInput { ... }
export interface CaptureResult { ... }
export interface DeviceContext { ... }
export interface SubmitResult { ... }

// Registry and builder
export class PluginRegistry { ... }
export class ReportBuilder { ... }

// Errors
export class ShakeNbakeError extends Error { ... }

// Mock adapter for testing
export class MockAdapter implements DestinationAdapter { ... }
```

#### @shakenbake/web

```typescript
// Provider
export function ShakeNbakeProvider(props: ShakeNbakeProviderProps): React.ReactNode

export interface ShakeNbakeProviderProps {
  config: ShakeNbakeConfig;
  children: React.ReactNode;
}

// Hook
export function useShakeNbake(): UseShakeNbakeResult

export interface UseShakeNbakeResult {
  trigger: () => void;
  isOpen: boolean;
  currentStep: FlowStep;
  config: ShakeNbakeConfig;
}

// Built-in triggers
export class KeyboardTrigger implements TriggerPlugin { ... }
export class FABTrigger implements TriggerPlugin { ... }

// Built-in adapters
export class ProxyAdapter implements DestinationAdapter { ... }

// Context
export const ShakeNbakeContext: React.Context<UseShakeNbakeResult | null>
```

#### @shakenbake/react-native

```typescript
// Provider
export function ShakeNbakeProvider(props: ShakeNbakeProviderProps): React.ReactNode

export interface ShakeNbakeProviderProps {
  config: ShakeNbakeConfig;
  children: React.ReactNode;
}

// Hook
export function useShakeNbake(): UseShakeNbakeResult

export interface UseShakeNbakeResult {
  trigger: () => void;
  isOpen: boolean;
  currentStep: FlowStep;
  config: ShakeNbakeConfig;
}

// Built-in trigger
export class ShakeTrigger implements TriggerPlugin { ... }

// Built-in capture
export class ViewShotCapture implements CapturePlugin { ... }

// Built-in context collector
export class DeviceContextCollector implements ContextCollector { ... }

// Context
export const ShakeNbakeContext: React.Context<UseShakeNbakeResult | null>
```

#### @shakenbake/linear

```typescript
// Linear adapter
export class LinearAdapter implements DestinationAdapter {
  constructor(config: LinearAdapterConfig);
  async uploadImage(imageData: Blob | Buffer, filename: string): Promise<string>;
  async createIssue(report: BugReport): Promise<SubmitResult>;
  async testConnection(): Promise<boolean>;
}

export interface LinearAdapterConfig {
  apiKey: string;
  teamId: string;
}
```

## PluginRegistry API

### Registration Methods

```typescript
class PluginRegistry {
  // Triggers
  registerTrigger(plugin: TriggerPlugin): void
  unregisterTrigger(name: string): void
  getTriggers(): TriggerPlugin[]

  // Capture
  registerCapture(plugin: CapturePlugin): void
  unregisterCapture(name: string): void
  getCapture(): CapturePlugin | undefined

  // Collectors
  registerCollector(collector: ContextCollector): void
  unregisterCollector(name: string): void
  getCollectors(): ContextCollector[]

  // Activation
  async activateTriggers(onTrigger: () => void): Promise<void>
  deactivateTriggers(): void

  // Context collection
  async collectContext(): Promise<Partial<DeviceContext>>

  // Cleanup
  clear(): void
}
```

## ReportBuilder API

```typescript
class ReportBuilder {
  constructor(registry: PluginRegistry, destination: DestinationAdapter);

  /**
   * Start screenshot capture
   */
  async startCapture(): Promise<CaptureResult>

  /**
   * Collect device and app context
   */
  async collectContext(): Promise<Partial<DeviceContext>>

  /**
   * Build complete bug report from user input
   */
  build(input: ReportInput, context: DeviceContext): BugReport

  /**
   * Submit report to destination adapter
   */
  async submit(report: BugReport): Promise<SubmitResult>
}
```

## Server-Side HTTP API (Web)

### POST /api/shakenbake

Submit a bug report from the web SDK to a server-side proxy.

**Request**:
```http
POST /api/shakenbake HTTP/1.1
Content-Type: application/json

{
  "title": "Login button not responding",
  "description": "Clicking the login button has no effect",
  "severity": "high",
  "screenshot": {
    "annotated": "base64-encoded-png-data",
    "original": "base64-encoded-png-data",
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  },
  "audio": null,
  "context": {
    "platform": {
      "os": "web",
      "version": "14.1.0",
      "userAgent": "Mozilla/5.0..."
    },
    "screen": {
      "resolution": { "width": 1920, "height": 1080 },
      "pixelRatio": 2,
      "orientation": "landscape"
    },
    "network": {
      "type": "wifi",
      "online": true
    },
    "locale": {
      "language": "en-US",
      "timezone": "America/New_York",
      "locale": "en-US"
    },
    "performance": {
      "memory": { "used": 125000000, "total": 4000000000 },
      "pageLoadTime": 2500,
      "lcp": 1800,
      "fcp": 850
    },
    "console": {
      "logs": [
        {
          "level": "error",
          "message": "Failed to fetch user profile",
          "timestamp": 1708000000000
        }
      ]
    },
    "app": {
      "url": "https://example.com/dashboard",
      "route": "/dashboard",
      "title": "Dashboard",
      "version": "2.1.0"
    }
  },
  "customMetadata": {
    "userId": "user-123",
    "accountTier": "premium"
  }
}
```

**Response (Success 200)**:
```json
{
  "url": "https://linear.app/workspace/issue/ENG-123",
  "id": "ENG-123",
  "success": true
}
```

**Response (Error 400)**:
```json
{
  "error": "Invalid API key",
  "code": "AUTH_FAILED"
}
```

**Response (Error 429)**:
```json
{
  "error": "Rate limited",
  "code": "RATE_LIMITED"
}
```

**Response (Error 500)**:
```json
{
  "error": "Failed to create issue",
  "code": "UPLOAD_FAILED"
}
```

### Example Implementation (Next.js)

```typescript
// app/api/shakenbake/route.ts
import { NextResponse } from 'next/server';
import { LinearAdapter } from '@shakenbake/linear';
import type { BugReport } from '@shakenbake/core';

const adapter = new LinearAdapter({
  apiKey: process.env.LINEAR_API_KEY!,
  teamId: process.env.LINEAR_TEAM_ID!,
});

export async function POST(req: Request) {
  try {
    const report: BugReport = await req.json();

    // Validate request
    if (!report.title || !report.description) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Optionally redact sensitive fields
    if (report.context?.app?.url) {
      // Could strip query parameters, etc.
    }

    // Submit to Linear
    const result = await adapter.createIssue(report);

    return NextResponse.json(result);
  } catch (error) {
    console.error('ShakeNbake submission error:', error);

    if (error instanceof Error && error.message.includes('AUTH')) {
      return NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_FAILED' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', code: 'UPLOAD_FAILED' },
      { status: 500 }
    );
  }
}
```

## Linear GraphQL API (Internal)

The `@shakenbake/linear` adapter uses these Linear GraphQL mutations:

### Create Issue

```graphql
mutation CreateIssue(
  $input: IssueCreateInput!
) {
  issueCreate(input: $input) {
    issue {
      id
      identifier
      url
    }
  }
}
```

**Variables**:
```json
{
  "input": {
    "teamId": "team-uuid",
    "title": "Login button not responding",
    "description": "Clicking the login button has no effect\n\nScreenshot: [attached]",
    "priorityId": "priority-high",
    "attachments": [
      {
        "fileName": "screenshot-annotated.png",
        "url": "https://cdn.example.com/uploads/file.png"
      }
    ]
  }
}
```

### Test Connection

```graphql
query {
  viewer {
    id
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_FAILED` | 401 | Invalid or missing API credentials |
| `RATE_LIMITED` | 429 | Rate limit exceeded (Linear API) |
| `UPLOAD_FAILED` | 500 | Image upload or issue creation failed |
| `NETWORK_ERROR` | 500+ | Network connectivity issue |

## Rate Limiting

- **Web SDK**: 1 report per 5 seconds (client-side throttling)
- **Linear API**: 100 requests per minute
- **Server proxy**: Inherit Linear API limits

## CORS Configuration (Web SDK)

The web SDK does NOT make direct requests to Linear API. All requests go through the server-side proxy endpoint, which should:

1. Accept requests from your application domain
2. Keep Linear API key server-side only
3. Return standard `Content-Type: application/json` responses

Example CORS headers:
```
Access-Control-Allow-Origin: https://your-app.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type
```

## Request/Response Size Limits

- **Screenshot image**: max 25 MB (Linear file size limit)
- **Request body**: max 50 MB
- **Timeout**: 30 seconds

## Retry Strategy

- **Client-side**: No automatic retry (user can retry via UI)
- **Server-side**: Implement retry logic for transient Linear API failures
- **Failed reports**: Optionally queue locally and retry on page reload

## Versioning

- **SDK API**: Follows semantic versioning
- **HTTP API**: Versioned via query parameter (`?v=1`)
- **Linear GraphQL**: No breaking changes planned (additive only)

## Authentication

### Web SDK + Server Proxy
```
Client → Proxy (/api/shakenbake) → Linear API
         ↓
      (Linear API key stored here)
```

### React Native SDK
```
Mobile App → Linear API
      ↓
  (API key in EXPO_PUBLIC_LINEAR_API_KEY)
```

## Backward Compatibility

- New fields in `DeviceContext` will be added as optional properties
- Breaking changes will trigger major version bumps
- Deprecation notices provided with 2-release warning period

## Type Definitions

All types are published with source maps for IDE autocomplete and inline documentation.

```typescript
// Full type information available
import type {
  BugReport,
  DeviceContext,
  ShakeNbakeConfig,
  DestinationAdapter,
  // ... etc
} from '@shakenbake/core';
```
