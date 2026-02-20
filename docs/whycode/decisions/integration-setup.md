# Integration Setup Reference

## Project Configuration

- **Project Type**: Cross-platform Bug Reporting SDK + SaaS Cloud App
- **Language**: TypeScript 5.x
- **Build System**: Yarn Classic (v1.22.22) + Turborepo v2
- **Monorepo Tool**: Turborepo v2.8.10
- **Testing**: Vitest v3.x

## Monorepo Structure

```
shakenbake/
├── package.json              # Root workspace config (yarn workspaces)
├── turbo.json                # Turborepo v2 config (uses "tasks" key)
├── tsconfig.base.json        # Shared TypeScript base config
├── .gitignore                # Comprehensive gitignore
├── packages/
│   ├── core/                 # @shakenbake/core - types, plugin interfaces
│   ├── linear/               # @shakenbake/linear - Linear GraphQL adapter
│   ├── web/                  # @shakenbake/web - Web SDK
│   ├── react-native/         # @shakenbake/react-native - Expo SDK
│   └── cloud-client/         # @shakenbake/cloud-client - Cloud client SDK
├── apps/
│   └── cloud/                # @shakenbake/cloud - Next.js cloud app (stub)
├── examples/
│   ├── expo-app/             # Future Expo example app
│   └── nextjs-app/           # Future Next.js example app
├── docs/                     # Project documentation (pre-existing)
└── CLAUDE.md                 # Agent guidance (pre-existing)
```

## Package Dependency Graph

```
@shakenbake/core (no dependencies)
  ├── @shakenbake/linear
  ├── @shakenbake/web
  ├── @shakenbake/react-native
  ├── @shakenbake/cloud-client
  └── @shakenbake/cloud (app)
```

All packages except `core` depend on `@shakenbake/core`. Turborepo manages the build order via `dependsOn: ["^build"]` in turbo.json.

## Build System Commands

| Command           | Description                                |
|-------------------|--------------------------------------------|
| `yarn install`    | Install all workspace dependencies         |
| `yarn build`      | Build all packages (respects dependency graph) |
| `yarn typecheck`  | Run TypeScript type checking in all packages |
| `yarn test`       | Run tests in all packages (vitest)         |
| `yarn lint`       | Run linting in all packages (placeholder)  |
| `yarn dev`        | Start dev mode in all packages             |
| `yarn add <pkg>`  | Add a dependency                           |
| `yarn add -D <pkg>` | Add a dev dependency                    |

## TypeScript Configuration

### Base Config (tsconfig.base.json)
- Target: ES2022
- Module system: NodeNext (with NodeNext resolution)
- Strict mode enabled
- `noUncheckedIndexedAccess`: true (safer index access)
- Declaration files and source maps generated

### Package Configs
Each package extends the base config and sets:
- `outDir`: "dist" (build output)
- `rootDir`: "src" (source directory)
- Cloud app additionally has JSX and DOM lib support

### Design Decision: No TypeScript Project References
We chose not to use TypeScript project references (`references` in tsconfig.json) because:
1. Turborepo already manages the build dependency graph via `dependsOn: ["^build"]`
2. Project references require `composite: true` which adds constraints
3. Yarn workspaces handle package resolution at install time
4. This keeps the tsconfig files simpler and avoids duplicate build orchestration

## Turborepo Configuration Notes

- Schema: `https://turborepo.dev/schema.json` (new domain, redirected from turbo.build)
- Uses `"tasks"` key (v2 syntax), NOT `"pipeline"` (v1 syntax)
- Build tasks have `dependsOn: ["^build"]` to respect the package dependency graph
- Test tasks have `dependsOn: ["build"]` so packages are built before testing
- Dev tasks are `persistent: true` and `cache: false`

## Known Issues and Gotchas

1. **Yarn network timeout**: Initial `yarn install` may be slow; use `--network-timeout 300000` if it stalls
2. **No license field warnings**: Package.json files currently lack a `"license"` field; add `"license": "MIT"` when publishing
3. **Cloud app build placeholder**: The `@shakenbake/cloud` build is a placeholder echo command until Next.js is configured
4. **Vitest passWithNoTests**: All test scripts use `--passWithNoTests` since packages start with no test files

## Verified Status

- [x] `yarn install` succeeds
- [x] `yarn typecheck` passes (6/6 packages)
- [x] `yarn build` passes (6/6 packages)
- [x] `yarn test` passes (12/12 tasks: 6 builds + 6 tests)
- [x] Dist output generated for all 5 library packages (index.js, index.d.ts, source maps)
