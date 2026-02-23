# ShakeNbake - Notifications and Feedback

## User Notifications

ShakeNbake provides feedback to users through various notification mechanisms depending on platform and context.

## Toast Notifications

Toast notifications are brief, non-intrusive messages that appear temporarily on screen.

### Success Toast
- **Trigger**: Report submitted successfully
- **Message**: "Bug report submitted successfully"
- **Duration**: 3 seconds
- **Position**: Top of screen (web), Top of screen (mobile)
- **Color**: Green (#10b981)
- **Icon**: Checkmark
- **Auto-dismiss**: Yes

### Error Toast
- **Trigger**: Network error, upload failed, validation error
- **Message**: Error-specific message (see Error Codes below)
- **Duration**: 5 seconds
- **Position**: Top/bottom of screen
- **Color**: Red (#ef4444)
- **Icon**: Warning/error icon
- **Action**: "Retry" button (if applicable)
- **Auto-dismiss**: Yes

### Info Toast
- **Trigger**: Informational messages (not commonly used)
- **Message**: Status messages during long operations
- **Duration**: 2 seconds
- **Position**: Top of screen
- **Color**: Blue (#3b82f6)
- **Icon**: Info icon
- **Auto-dismiss**: Yes

## Modal Dialogs

Modals are used for important user interactions and status updates.

### Loading Modal
- **Title**: "Submitting Report"
- **Content**: Loading spinner + status message
- **Actions**: None (modal cannot be dismissed)
- **Dismissible**: No (user must wait for completion or timeout)
- **Backdrop**: Semi-transparent, non-dismissible

**Status Messages**:
1. "Uploading screenshot..." (30-50% complete)
2. "Creating issue..." (50-100% complete)

### Success Modal

**Web Implementation**:
```
┌─────────────────────────────┐
│  ✓ Report Submitted         │
├─────────────────────────────┤
│  Issue created: ENG-123     │
│                             │
│  [View in Linear] [Dismiss] │
└─────────────────────────────┘
```

- **Title**: "Report Submitted"
- **Icon**: Green checkmark
- **Message**: "Issue created: [ISSUE_ID]"
- **Link**: Issue URL (clickable)
- **Actions**:
  - "View in Linear" — Opens issue in new tab
  - "Dismiss" — Closes modal and resets flow
- **Auto-dismiss**: After 10 seconds if user takes no action

**React Native Implementation**:
```typescript
Alert.alert(
  'Report Submitted',
  'Issue created: ENG-123\nhttps://linear.app/issue/ENG-123',
  [{ text: 'OK', onPress: handleDismiss }]
)
```

### Error Modal

**Web Implementation**:
```
┌─────────────────────────────────────┐
│  ⚠ Error                            │
├─────────────────────────────────────┤
│  Could not create issue. Try again.  │
│                                     │
│  [Retry] [Re-Annotate] [Dismiss]   │
└─────────────────────────────────────┘
```

- **Title**: "Error"
- **Icon**: Red warning icon
- **Message**: Error-specific message (see codes below)
- **Actions**:
  - "Retry" — Attempts submission again (if form data available)
  - "Re-Annotate" — Goes back to annotation canvas
  - "Dismiss" — Closes modal and resets flow

**Error Messages by Code**:

| Code | Message | Actions |
|------|---------|---------|
| AUTH_FAILED | "Could not authenticate. Check your API key." | [Dismiss] |
| RATE_LIMITED | "Too many requests. Try again in 1 minute." | [Retry] (disabled), [Dismiss] |
| UPLOAD_FAILED | "Could not upload screenshot. Please try again." | [Retry], [Dismiss] |
| NETWORK_ERROR | "Connection lost. Check your network and try again." | [Retry], [Dismiss] |

**React Native Implementation**:
```typescript
Alert.alert(
  'Error',
  'Could not upload screenshot. Please try again.',
  [
    { text: 'Retry', onPress: handleRetry },
    { text: 'Dismiss', style: 'cancel', onPress: handleDismiss }
  ]
)
```

## Console Logging

Console logs provide debugging information for developers.

### Log Levels

**Error** (`console.error`)
```
[ShakeNbake] Error: Screenshot capture failed
[ShakeNbakeProvider] Trigger "shake" activation failed: [Error details]
[LinearAdapter] GraphQL error: Cannot create issue [details]
```

**Warning** (`console.warn`)
```
[ShakeNbake] Context collector "device" timed out
[ShakeNbake] Prototype pollution attempt detected
```

**Info** (`console.log`)
```
[ShakeNbake] Report submitted successfully
[ShakeNbake] Trigger activated: keyboard
```

### Enable/Disable Logging

Logging is **always on** (no configuration option currently). Error handling ensures failures don't crash the app — they're logged and handled gracefully.

Future versions may support:
```typescript
<ShakeNbakeProvider
  config={{
    debug: {
      logLevel: 'error' | 'warn' | 'info',  // log only errors, warnings, or all
      logToServer: false  // send logs to analytics service
    }
  }}
>
```

## Progress Indicators

Progress feedback during long operations.

### Upload Progress (Planned)

**Web**:
```
Uploading... [=====>      ] 45%
```

**React Native**:
```
⬇️ Uploading... 45%
```

- Updates every 100ms
- Shows percentage and KB/s estimate
- Can be disabled in config (show spinner instead)

## Accessibility Notifications

### Screen Reader Announcements

Using ARIA live regions and React announcements:

```typescript
// Form validation error
announce("Title is required");

// Status during submit
announce("Uploading report, please wait");

// Success
announce("Report submitted successfully. Issue created with ID ENG-123");

// Error
announce("Failed to submit report. Please try again.");
```

### Focus Management

- Opening modal: Focus moves to modal (trap within modal)
- Closing modal: Focus returns to trigger element
- Form validation: Focus moves to first error field

## Analytics Events (Planned)

ShakeNbake can optionally send analytics to a configured endpoint.

**Events** (no collection in v1):
- `report_triggered` — User opened the report flow
- `annotation_started` — User opened the annotation canvas
- `annotation_completed` — User finished annotating
- `form_opened` — User saw the report form
- `form_submitted` — User clicked submit
- `submission_success` — Report successfully submitted
- `submission_failed` — Report failed to submit
- `submission_retried` — User retried after failure

## Settings and Permissions

### Notifications Configuration

```typescript
<ShakeNbakeProvider
  config={{
    notifications: {
      showSuccessMessage: true,      // Show success toast
      showErrorMessage: true,        // Show error toast
      showLoadingIndicator: true,    // Show loading state
      autoHideSuccessAfter: 3000,   // Auto-dismiss success (ms)
      autoHideErrorAfter: 5000,     // Auto-dismiss error (ms)
    }
  }}
>
```

### Permission Requests (Mobile)

No permission requests for core functionality. Optional:
- **Audio recording** (future): Requires microphone permission
- **Photo library** (future): For alternative screenshot sources

## Error Recovery

### Automatic Retries

- **Network errors**: Automatically retry 1x after 2 seconds
- **Rate limiting**: Show retry button (user-initiated)
- **Auth errors**: Show configuration hint, no auto-retry

### Manual Retries

Users can retry through UI:
1. Submit fails with error modal
2. User clicks "Retry"
3. Form and screenshots preserved
4. Submission reattempted

### Offline Queueing (Future)

Planned for Phase 2:
- Queue reports when offline
- Sync when connection restored
- Show "queued" status to user

## Email Notifications (Cloud Version, Planned)

ShakeNbake Cloud will support email notifications.

### Notification Types

1. **New Report** — When report submitted to workspace
   - To: Workspace members with notify=true
   - Content: Issue title, link, screenshot thumbnail

2. **Comment on Report** — When team member comments
   - To: Report submitter (if email provided)
   - Content: Comment text, responder name, issue link

3. **Issue Closed** — When Linear issue status changes
   - To: Report submitter (if email provided)
   - Content: Closure reason, fixed version

## System Notifications (Mobile)

### Planned Features

- **Background completion** (future):
  - If network request still pending on app suspend
  - Local notification when complete

```
"Your bug report was submitted"
[Dismiss] [View Issue]
```

## Failure Scenarios and Recovery

### Scenario: User Presses Home Button During Submit

**Expected Behavior**:
1. Request continues in background (mobile OS permits ~30 seconds)
2. If completes: Silent success (no UI shown)
3. If timeout: Request cancelled, user can retry on return
4. Form data preserved for retry

### Scenario: Network Drops During Upload

**Expected Behavior**:
1. Error modal shown: "Connection lost"
2. User can retry (form data preserved)
3. Or dismiss to exit flow
4. Report not created (partial upload fails)

### Scenario: Rate Limited by Linear API

**Expected Behavior**:
1. Error modal: "Too many requests"
2. Retry button disabled for 60 seconds
3. After 60s: Retry enabled
4. Form data preserved

## Compliance

### GDPR

- Notifications do not collect user data
- Error logs may contain user-submitted content (title, description)
- Screenshots not stored in client app (immediately uploaded)

### HIPAA

- No health data tracked or logged
- Optional encryption for sensitive documents (planned)

### WCAG 2.1 AA

- All notifications keyboard accessible
- Screen reader announcements provided
- Color not sole indicator of status
- 4.5:1 contrast ratio maintained
