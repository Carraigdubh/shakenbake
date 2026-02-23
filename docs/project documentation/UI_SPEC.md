# ShakeNbake - UI Specification

## Overview

ShakeNbake presents a multi-step UI flow for capturing, annotating, and submitting bug reports. The UI is platform-specific (Web vs. React Native) but follows a consistent UX pattern.

## Flow Diagram

```
START (User triggers)
  ↓
CAPTURE & ANNOTATE
  ├─ User can draw/annotate on screenshot
  ├─ Tools: pen, arrows, circles, rectangles, eraser
  ├─ Actions: undo, redo, save, cancel
  └─ Result: annotated screenshot
  ↓
REPORT FORM
  ├─ Title (required)
  ├─ Description (required)
  ├─ Severity (required, default: high)
  ├─ Email (optional)
  ├─ Preview images (annotated + original)
  └─ Actions: submit, re-annotate, cancel
  ↓
SUBMIT
  ├─ Loading indicator
  ├─ Uploader progress (if available)
  └─ Result: success/error
  ↓
SUCCESS SCREEN / ERROR SCREEN
  ├─ Display Linear issue URL
  ├─ Actions: dismiss
  └─ Reset to idle
END
```

## Web UI Components

### 1. Floating Action Button (FAB)

**Trigger UI** — Optional floating button to manually open report flow.

**Appearance**:
- Fixed position: bottom-right or bottom-left (configurable)
- Size: 56x56 dp (Material Design standard)
- Icon: Camera/bug icon
- Elevation: Shadow on light theme
- Color: Accent color (default: #6366f1 indigo)

**States**:
- **Default**: Visible, ready to tap
- **Hover**: Slight lift, enhanced shadow
- **Active**: Clicked, triggers flow

**Configuration**:
```typescript
{
  ui: {
    showFAB: true,
    position: 'bottom-right',  // or 'bottom-left'
    accentColor: '#6366f1'
  }
}
```

### 2. Annotation Canvas

**Drawing Overlay** — Full-screen canvas for annotating the screenshot.

**Appearance**:
- Screenshot displayed at full screen size
- Drawing tools toolbar at bottom
- Undo/redo buttons at top-right

**Tools**:
1. **Pen** — Freehand drawing, variable stroke width
2. **Arrow** — Straight arrows with arrowhead
3. **Circle** — Perfect circles (hold Shift for perfect circle)
4. **Rectangle** — Rectangles with rounded corners
5. **Eraser** — Erase drawn elements
6. **Color Picker** — Select stroke color
7. **Stroke Width** — Adjust pen thickness (1-10px)

**Colors** (Configurable):
- Light theme: Dark gray/black default
- Dark theme: White/light gray default
- Custom colors via UI

**Actions**:
- **Undo**: Ctrl+Z (web), swipe (mobile)
- **Redo**: Ctrl+Y (web)
- **Save**: Next button
- **Cancel**: Back button

**Web Implementation**:
```typescript
<ShakeNbakeProvider
  config={{
    enabled: true,
    destination: adapter,
    ui: {
      theme: 'dark',
      accentColor: '#6366f1'
    }
  }}
>
  {/* Canvas rendered as overlay modal */}
</ShakeNbakeProvider>
```

**React Native Implementation** (Skia-based):
- Canvas with pinch-zoom support
- Touch pressure sensitivity for variable stroke width
- 60fps GPU-accelerated rendering

### 3. Report Form

**Input Screen** — Collects user description and severity.

**Fields**:
1. **Title** (text input, max 200 chars)
   - Placeholder: "What's the problem?"
   - Required: Yes
   - Character counter: Shows remaining

2. **Description** (textarea, max 2000 chars)
   - Placeholder: "Tell us more..."
   - Required: Yes
   - Multiline input with auto-expand

3. **Severity** (dropdown)
   - Options: Critical, High, Medium, Low
   - Default: High
   - Required: Yes

4. **Email** (text input, optional)
   - Placeholder: "your@email.com"
   - Type: email
   - Required: No (depends on config)
   - Useful for follow-up questions

5. **Screenshot Preview**
   - Two tabs: "Annotated" / "Original"
   - Full-width image preview
   - Clickable to re-annotate

**Form Validation**:
- Title: Non-empty, max 200 characters
- Description: Non-empty, max 2000 characters
- Severity: One of [critical, high, medium, low]
- Email: Valid email format (if provided)

**Actions**:
- **Submit**: Send report (POST to /api/shakenbake or destination adapter)
- **Re-Annotate**: Go back to annotation canvas
- **Cancel**: Close without sending

**Accessibility**:
- WCAG 2.1 AA compliant
- Keyboard navigation (Tab/Shift+Tab)
- Focus indicators on all interactive elements
- Semantic HTML (`<label>`, `<textarea>`, etc.)
- Screen reader announcements for validation errors

**Theme Support**:
```typescript
// Light Theme
{
  backgroundColor: '#ffffff',
  textColor: '#000000',
  borderColor: '#e5e7eb',
  accentColor: '#6366f1'
}

// Dark Theme
{
  backgroundColor: '#1f2937',
  textColor: '#ffffff',
  borderColor: '#374151',
  accentColor: '#6366f1'
}
```

### 4. Loading State

**During Submit** — Shows progress and status.

**Appearance**:
- Modal overlay with semi-transparent background
- Spinner animation (centered)
- Status message: "Uploading..." → "Creating issue..."
- Optional progress bar (if upload progress available)

**Duration**:
- Typical: 2-5 seconds
- Timeout: 30 seconds
- Long uploads shown with percentage

### 5. Success Screen

**After Submit** — Confirmation with issue link.

**Appearance**:
- Modal with checkmark icon
- Title: "Report Submitted"
- Message: "Issue created: ENT-123"
- Clickable URL to Linear issue
- "Dismiss" button

**Actions**:
- Click URL to open Linear issue (new tab)
- Dismiss to close and reset

### 6. Error Screen

**On Failure** — Error message and recovery options.

**Appearance**:
- Modal with error icon
- Title: "Error"
- Error message (specific to error type)
- Action buttons based on context

**Error Types**:

1. **AUTH_FAILED** ("Invalid API Key")
   - Message: "Could not authenticate. Check your API key."
   - Actions: [Dismiss]

2. **RATE_LIMITED** ("Rate Limited")
   - Message: "Too many requests. Try again in 1 minute."
   - Actions: [Dismiss] or [Retry] after delay

3. **UPLOAD_FAILED** ("Upload Failed")
   - Message: "Could not upload screenshot."
   - Actions: [Retry], [Re-Annotate], [Dismiss]

4. **NETWORK_ERROR** ("No Internet")
   - Message: "Connection lost. Check your network."
   - Actions: [Retry], [Dismiss]

## React Native UI Components

### 1. Shake Trigger
No visible UI — Detects device shake silently.

### 2. Annotation Canvas (Skia)

**Appearance**:
- Full-screen canvas
- Toolbar at bottom with horizontal scroll
- Undo/redo at top-right

**Tools** (same as Web):
- Pen, Arrow, Circle, Rectangle, Eraser, Color, Width

**Touch Interactions**:
- Drag to draw
- Pinch to zoom
- Two-finger tap for context menu

### 3. Report Form

**Appearance**:
- Modal with KeyboardAvoidingView
- Stacked layout (mobile-optimized)
- Buttons: Submit, Re-Annotate, Cancel

**Differences from Web**:
- Touch-optimized input areas
- Larger tap targets (44x44 minimum)
- Portrait orientation recommended

### 4. Loading/Success/Error Modals

**Same as Web** but using React Native components:
- `Alert.alert()` for simple messages
- Custom Modal component for complex layouts

## Responsive Design

### Web

**Breakpoints**:
- **Mobile** (<640px): Full-width, stacked layout
- **Tablet** (640-1024px): 2-column where appropriate
- **Desktop** (>1024px): Standard layout with sidebars

**Canvas Scaling**:
- Scales to fit screen while maintaining aspect ratio
- Annotation tools remain accessible
- Form responsive to screen size

### React Native

**Orientations**:
- Portrait: Primary (recommended)
- Landscape: Supported with adjusted layout
- All UI elements remain accessible in both

## Theming

### Theme Configuration

```typescript
<ShakeNbakeProvider
  config={{
    ui: {
      theme: 'dark',           // 'light' | 'dark' | 'auto'
      accentColor: '#6366f1',  // Custom brand color
      showFAB: true,
      position: 'bottom-right'
    }
  }}
>
```

### Color Palette

**Light Theme**:
```css
--bg-primary: #ffffff
--bg-secondary: #f3f4f6
--text-primary: #000000
--text-secondary: #6b7280
--border: #e5e7eb
--error: #ef4444
--success: #10b981
--accent: #6366f1 (configurable)
```

**Dark Theme**:
```css
--bg-primary: #1f2937
--bg-secondary: #111827
--text-primary: #ffffff
--text-secondary: #d1d5db
--border: #374151
--error: #f87171
--success: #34d399
--accent: #6366f1 (configurable)
```

### Auto Theme Detection

When `theme: 'auto'`:
- Web: Respect `prefers-color-scheme` media query
- Mobile: Respect system appearance setting
- Default to dark if detection fails

## Typography

**Font Stack** (Web):
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
             Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
```

**Sizes**:
- **Title**: 24px (form) / 20px (mobile)
- **Body**: 14px (desktop) / 16px (mobile)
- **Label**: 12px (desktop) / 14px (mobile)
- **Small**: 12px

**Line Heights**:
- Titles: 1.3
- Body: 1.5
- Labels: 1.4

## Spacing

**Scale** (baseline: 4px):
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px

## Accessibility Features

### Keyboard Navigation
- Tab: Move between form fields
- Shift+Tab: Move backwards
- Enter: Submit form
- Escape: Cancel/Close

### Screen Reader Support
- Form labels associated with inputs
- Error messages announced
- Status updates announced (loading, success)
- Button purposes described

### Motion
- Reduced motion: Disable animations when `prefers-reduced-motion` set
- Spinners: Minimal animation opacity change instead of rotation

### Color Contrast
- Text/background: Minimum 4.5:1 ratio (WCAG AA)
- Focus indicators: 3:1 visible contrast

## Performance Considerations

### Web
- Lazy load annotation canvas (only on trigger)
- Virtualize long console logs in context view
- Debounce canvas drawing updates to 60fps
- Compress base64 images in preview

### React Native
- Skia canvas optimized for 60fps
- Image compression before submission
- Cleanup refs on component unmount

## Mobile-Specific Behaviors

### iOS
- Safe area insets respected
- Bottom sheet style for modals
- Haptic feedback on button tap (optional)

### Android
- Material Design 3 conventions
- System navigation bar respected
- Hardware back button closes modal

## Localization

**Supported Languages** (Planned):
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)

**Translatable Strings**:
- Form labels, placeholders, buttons
- Error messages
- Success messages
- Tool names

## Testing Checklist

- [ ] Form validation on submit
- [ ] Annotation tools functional
- [ ] Theme switching works
- [ ] Responsive layout on all breakpoints
- [ ] Keyboard navigation accessible
- [ ] Screen reader compatible
- [ ] Mobile touch interactions
- [ ] Error states display correctly
- [ ] Success screen shows correct issue URL
- [ ] Can navigate between form and annotation
