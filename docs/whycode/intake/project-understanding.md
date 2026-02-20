# ShakeNbake — Project Understanding

## Vision
Open-source (MIT) cross-platform bug reporting SDK. Users shake their device or press a keyboard shortcut to capture a screenshot, annotate it, optionally record audio, and submit a bug report as a Linear issue.

## Goals
1. Replace expensive bug reporting tools (Shake $160-340/mo, Instabug $249+/mo) with open-source alternative
2. Support both React Native/Expo and Web platforms
3. Plugin architecture for extensible destination adapters
4. Zero-config defaults with maximum context collection
5. Optional hosted Cloud version at $10/mo

## Scope: v0.1 MVP
1. @shakenbake/core — types, plugin interfaces, report builder
2. @shakenbake/linear — Linear GraphQL adapter (issueCreate + fileUpload)
3. @shakenbake/web — Web SDK (keyboard/FAB trigger, html2canvas, Canvas annotation, browser context)
4. @shakenbake/react-native — Mobile SDK (shake trigger, view-shot, Skia annotation, device context)
5. Example apps (Expo + Next.js)
6. MockAdapter for testing without Linear

## Technical Constraints
- Expo SDK 52+ with development builds (no Expo Go)
- Server-side proxy pattern for Linear API keys on web
- html2canvas limitations (no cross-origin iframes, no backdrop-filter)
- Skia for RN annotation (60fps GPU-accelerated)
- Turborepo monorepo with coordinated releases via changesets

## Integrations
- Linear GraphQL API (primary destination adapter)
- MockAdapter (testing without Linear)

## Build Order
1. core → 2. linear → 3. web (parallel with 4) → 4. react-native → 5. examples → 6. MockAdapter

## Source Documents
- docs/ShakeNbake-PRD.md (full PRD, 1174 lines)
- docs/ShakeNbake-SUMMARY.md (quick reference)
