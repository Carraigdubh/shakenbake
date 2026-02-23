# Capability Preflight Summary

**Run Date:** 2026-02-23
**Run ID:** capability-analysis-20260223

## Execution Scope

This run targets **two packages in isolation**:

1. `@shakenbake/core` - Platform-agnostic types and plugin system
2. `@shakenbake/react-native` - Expo SDK for mobile bug reporting

**Out of Scope:** Cloud app (apps/cloud), Convex, Clerk, Vercel deployment topology.

## Detected Tech Stack

### Core Technologies
- **TypeScript** 5.8.0 (for compilation)
- **React** 18.0.0+ (context provider pattern)
- **React Native** 0.76.0+ (peer dependency)
- **Expo SDK 52+** (development builds required, not Expo Go)

### Mobile Native Modules (Optional Peer Dependencies)
- **react-native-shake** 6.0.0+ (device shake trigger via native module)
- **react-native-view-shot** 4.0.0+ (screenshot capture plugin)
- **@shopify/react-native-skia** 2.0.0+ (60fps GPU annotation drawing)

### Build & Testing
- **Turborepo** 2.5.0 (monorepo orchestration)
- **Vitest** 3.1.0 (test runner)
- **Node** 20.0.0+ (runtime requirement)

## Routing Recommendations

### Primary Surfaces

| Surface | Specialist Agent | Reasoning |
|---------|------------------|-----------|
| **backend** | `whycode:backend-agent` | Core TypeScript plugin registry, type definitions, error handling |
| **frontend-native** | `whycode:frontend-native-agent` | React Native provider, async trigger handling, Expo ecosystem, Skia patterns |
| **shared** | `whycode:test-agent` | Vitest validation, TDD for async refactoring |

### No Gaps Found

All required tech stack components have corresponding specialist agents available:
- ✅ React Native support
- ✅ Expo SDK expertise
- ✅ TypeScript compilation
- ✅ Async/await patterns
- ✅ Testing framework integration

## Key Implementation Tasks

### 1. Make Trigger Activation Async
- **File:** `packages/core/src/plugin-registry.ts`
- **Current:** `activateTriggers(onTrigger: () => void): void` — synchronous
- **Issue:** `react-native-shake` v6.0.0+ may have async `activate()` method
- **Fix:** Make method async: `async activateTriggers(...): Promise<void>`
- **Impact:** Update callers to await activation

### 2. Fix Provider Await Logic
- **File:** `packages/react-native/src/ShakeNbakeProvider.tsx`
- **Current:** Line 187 calls `registry.activateTriggers()` without await in useEffect
- **Issue:** If trigger activation is async, unhandled promise
- **Fix:** Wrap in proper async function with cleanup, OR use fire-and-forget with error handling
- **Pattern:** See line 209-240 for correct async pattern

### 3. Android GL/Skia Compatibility
- **File:** `packages/react-native/src/capture/screenshot.ts`
- **Issue:** react-native-view-shot on Android with Skia may fail with GL surface errors
- **Fix:** Add platform detection, fallback capture strategy, or require explicit Android configuration
- **Documentation:** Add comment explaining Android Skia surface requirements

### 4. React-Native-Shake Autolinking Workaround
- **Location:** New documentation file in `docs/` or README
- **Content:** Explain Expo development build requirement, autolinking setup, manual linking if needed
- **Audience:** Users integrating ShakeTrigger in Expo projects

## Deployment Context

**Mode:** Not applicable (library development phase)

- No Vercel CLI needed
- No GitHub Actions CI/CD in scope
- No environment variables required
- Focus: local development, test pass/fail

## Convex Context

**Mode:** Not applicable (Cloud app is future scope)

- Convex is planned for `apps/cloud` backend (future run)
- Current run: independent library packages only
- No CONVEX_DEPLOY_KEY needed
- No deployment mode resolution required

## Verification Checklist

Before marking this capability analysis complete:

- [x] Detected all tech in @shakenbake/core
- [x] Detected all tech in @shakenbake/react-native
- [x] Mapped to specialist agents (no gaps)
- [x] No Convex/Cloud dependencies
- [x] No Vercel/Clerk in scope
- [x] Routing plan covers all surfaces
- [x] Identified async/await refactoring needs
- [x] Android GL/Skia compatibility documented

## Next Steps (Post-Capability-Analysis)

1. **Backend agent** executes: async trigger activation in plugin-registry.ts
2. **Frontend-native agent** executes: provider await logic, Android GL workaround, autolinking docs
3. **Test agent** validates: typecheck, lint, test, build all pass
4. **Git commit** with proper task tags (e.g., `feat(core): make trigger activation async`)

## Notes for Agents

- Read this summary + files in `docs/whycode/runs/` for iteration history
- Check `git log --oneline -10` for previous commits in this run
- All code is TypeScript (strict mode) — no JS runtime tricks
- Peer dependencies may not be installed — use dynamic imports with error handling
- React hooks in provider must follow rules: no conditional hooks, proper cleanup
- Android GL surface errors are real; document workarounds, don't hide them
