# Feature: MockAdapter

## Status: Planning

## Overview

The MockAdapter is a `DestinationAdapter` implementation that logs bug reports to the console and returns fake issue URLs. It requires no API keys, no network access, and no external services. It is designed for local development, testing, CI pipelines, and as a default fallback when no real adapter is configured.

The MockAdapter enables developers to experience the full ShakeNbake reporting flow (trigger -> capture -> annotate -> submit) without setting up a Linear account or any other issue tracker.

## User Story

As a developer trying ShakeNbake for the first time, I want to see the full bug reporting flow work end-to-end without needing to configure a Linear API key so that I can evaluate the SDK quickly.

As a developer writing tests or running CI, I want a mock destination adapter that captures submitted reports in memory so that I can verify the SDK's behavior without making real API calls.

## Acceptance Criteria

### DestinationAdapter Implementation

- [ ] `MockAdapter` class implements the `DestinationAdapter` interface from `@shakenbake/core`
- [ ] `name` property returns `'mock'`
- [ ] Constructor accepts optional configuration:
  ```typescript
  interface MockAdapterConfig {
    logToConsole?: boolean;      // Default: true. Log reports to console
    simulateDelay?: number;      // Default: 500. Simulated network delay in ms
    simulateErrors?: boolean;    // Default: false. Randomly throw errors for testing
    errorRate?: number;          // Default: 0.2. Probability of simulated error (0-1)
    onReport?: (report: BugReport) => void;  // Callback when a report is submitted
  }
  ```

### uploadImage

- [ ] `uploadImage(imageData: Buffer | Blob, filename: string): Promise<string>` is implemented
- [ ] Returns a fake URL in the format: `https://mock.shakenbake.dev/images/{uuid}/{filename}`
- [ ] Logs the upload to console (if `logToConsole` is true): `[ShakeNbake Mock] Image uploaded: {filename} ({size} bytes)`
- [ ] Simulates network delay (configurable, default 500ms)
- [ ] If `simulateErrors` is true, randomly throws `ShakeNbakeError` with code `UPLOAD_FAILED` based on `errorRate`

### createIssue

- [ ] `createIssue(report: BugReport): Promise<{ url: string; id: string }>` is implemented
- [ ] Returns a fake issue result:
  ```typescript
  {
    id: 'MOCK-{incrementing_number}',
    url: 'https://mock.shakenbake.dev/issues/MOCK-{number}'
  }
  ```
- [ ] Logs the full report to console (if `logToConsole` is true):
  ```
  [ShakeNbake Mock] Issue created: MOCK-1
    Title: {report.title}
    Severity: {report.severity}
    Category: {report.category}
    Context keys: {list of context fields collected}
    Screenshot: {dimensions}
    Audio: {present/absent}
  ```
- [ ] Calls `onReport` callback (if provided) with the full `BugReport` object
- [ ] Simulates network delay (configurable, default 500ms)
- [ ] If `simulateErrors` is true, randomly throws `ShakeNbakeError` with code `NETWORK_ERROR` based on `errorRate`
- [ ] Issue numbers increment across the adapter instance lifetime (MOCK-1, MOCK-2, MOCK-3, etc.)

### testConnection

- [ ] `testConnection(): Promise<boolean>` is implemented
- [ ] Always returns `true` (the mock adapter is always "connected")
- [ ] Logs to console: `[ShakeNbake Mock] Connection test: OK`

### Report Storage

- [ ] Maintains an in-memory array of all submitted reports
- [ ] `getReports(): BugReport[]` method returns all reports submitted during the adapter's lifetime
- [ ] `getLastReport(): BugReport | undefined` returns the most recently submitted report
- [ ] `clearReports(): void` clears the in-memory report history
- [ ] Useful for assertions in tests:
  ```typescript
  const mock = new MockAdapter();
  // ... trigger a report ...
  expect(mock.getReports()).toHaveLength(1);
  expect(mock.getLastReport()?.title).toBe('Button is misaligned');
  ```

### Error Simulation

- [ ] When `simulateErrors` is true, the adapter randomly throws typed `ShakeNbakeError` instances
- [ ] Error types are distributed to cover different scenarios:
  - `UPLOAD_FAILED` (retryable: true) on `uploadImage`
  - `NETWORK_ERROR` (retryable: true) on `createIssue`
  - `AUTH_FAILED` (retryable: false) occasionally for testing auth error handling
  - `RATE_LIMITED` (retryable: true) occasionally for testing rate limit handling
- [ ] Error rate is configurable via `errorRate` (default 0.2 = 20% chance)
- [ ] Useful for testing the SDK's error handling UI and offline queue behavior

## Technical Approach

### Package Location

The MockAdapter lives in `@shakenbake/core` (not a separate package) since it has no external dependencies and is useful across all platforms.

```
packages/core/
  src/
    mock-adapter.ts    # MockAdapter class
    ...
```

It is exported from `@shakenbake/core`:

```typescript
import { MockAdapter } from '@shakenbake/core';
// or
import { MockAdapter } from '@shakenbake/core/mock';
```

### Key Design Decisions

- The MockAdapter lives in `@shakenbake/core` rather than a separate package because it has zero dependencies and should be trivially available everywhere
- Console logging uses a `[ShakeNbake Mock]` prefix for easy identification in logs
- In-memory report storage enables test assertions without external mocking libraries
- Simulated delay defaults to 500ms to mimic realistic network behavior in the UI
- Error simulation is opt-in (off by default) so it does not surprise first-time users
- The `onReport` callback enables custom handling (e.g., sending to a test harness or displaying in a debug UI)

## Dependencies

- `@shakenbake/core` (this IS part of the core package -- no additional dependencies)

## Tasks
