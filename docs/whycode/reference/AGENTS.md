# Agent Definitions

This file contains execution protocols for WhyCode.
Agents read this file AND their specific definition file when run.

## CRITICAL: Always Use `whycode:` Prefix

**Anthropic has built-in agents with similar names.** Always use the `whycode:` prefix to ensure you invoke WhyCode's agents, not built-in alternatives.

```
✅ CORRECT: whycode:frontend-agent
❌ WRONG:   frontend-agent (may invoke Anthropic's built-in)
```

---

## Agent Definition Files

Full agent definitions are in `../../../agents/`:

### Implementation Agents (Heavy Work)
| Agent (invoke as) | Model | Color | Description |
|-------------------|-------|-------|-------------|
| `whycode:backend-agent` | opus | blue | Backend APIs, database, server logic |
| `whycode:backend-convex-agent` | opus | cobalt | Convex schema/functions/index/auth patterns with deployment-mode guardrails |
| `whycode:backend-auth-agent` | opus | indigo | Clerk-focused authN/authZ, middleware, webhook safety |
| `whycode:frontend-agent` | opus | green | UI components, pages, client logic |
| `whycode:frontend-web-agent` | opus | emerald | Next.js/web frontend with App Router best practices |
| `whycode:frontend-native-agent` | opus | lime | Expo/React Native frontend and mobile runtime correctness |
| `whycode:deploy-vercel-agent` | sonnet | violet | Vercel deployment/env/runtime readiness with topology detection (GitHub integration vs CLI) |
| `whycode:test-agent` | haiku | yellow | Unit/integration testing |
| `whycode:e2e-agent` | haiku | orange | E2E UI testing (Chrome for web, Maestro for Expo) |
| `whycode:review-agent` | opus | red | Code quality, bugs, security |
| `whycode:tech-stack-setup-agent` | sonnet | purple | Project setup, configuration |
| `whycode:docs-agent` | haiku | cyan | Documentation generation |

### Utility Agents (Keep Orchestrator Context Clean)
| Agent (invoke as) | Model | Color | Description |
|-------------------|-------|-------|-------------|
| `whycode:dependency-agent` | haiku | pink | Install packages, verify lockfiles |
| `whycode:validation-agent` | haiku | teal | Run build/typecheck/lint/test |
| `whycode:linear-agent` | haiku | indigo | Linear API interactions |
| `whycode:context-loader-agent` | haiku | gray | Read files, return summaries |
| `whycode:state-agent` | haiku | brown | Update state files |
| `whycode:git-agent` | haiku | black | Git/GitHub operations (branch, push, PR, issue) |

Each agent file contains:
- **Frontmatter**: `name`, `description`, `model`, `color`, `tools` (scoped)
- **IMMUTABLE_DECISIONS enforcement**: Rules agents MUST follow
- **Workflow**: Step-by-step execution
- **Artifact format**: Output structure
- **What NOT to do**: Constraints

## Specialist Preflight Gate Contract (Mandatory)

Every specialist agent (for example `frontend-web`, `frontend-native`, `backend-convex`, `backend-auth`, `deploy-vercel`) MUST implement its own preflight gate.

Required specialist preflight behavior:
- Read specialist context from capability outputs and specialist decision files in `docs/whycode/decisions/`.
- Resolve required mode/context deterministically (do not guess).
- Fail closed when required context is unknown or ambiguous.
- Write a preflight artifact before implementation:
  - `docs/whycode/audit/specialist-preflight-{planId}.json`
- Include at minimum:
  - `agent`
  - `planId`
  - `status` (`pass|blocked`)
  - `resolvedContext` (mode/topology/provider specifics)
  - `source` (`capability-plan|user-selection|docs|inferred`)
  - `commandsBlockedForSafety`
  - `requiresUserInput`

For new specialist-agent requests (manual or GitHub issue flow), this contract is mandatory acceptance criteria.

## New Specialist Agent Authoring Protocol (Mandatory)

When implementing a new specialist agent in the WhyCode repository:
- Read policy sources first:
  - repository `CLAUDE.md`
  - this file (`docs/whycode/reference/AGENTS.md` in consumer runtime / source `skills/whycode/reference/AGENTS.md`)
- Implement specialist preflight gate contract in the new agent definition.
- If adding/changing cross-agent policy, update both:
  - `CLAUDE.md` (repo development policy)
  - this file (`AGENTS.md`) (agent execution contract)
- If behavior visible to plugin users changes, update `README.md`.
- Do not mark agent work complete until policy/docs updates are included.

## Specialist Metadata Contract (Mandatory)

Every specialist agent file must include a `Specialist Metadata (Mandatory)` section with:
- `sourceDocs`: canonical vendor documentation links used as source-of-truth
- `versionScope`: supported framework/provider version range assumptions
- `lastVerifiedAt`: ISO date when metadata/docs were last validated
- `driftTriggers`: conditions that require agent refresh (API/docs/dependency/runtime shifts)

These metadata fields are required for both:
- new specialist agents
- specialist agent updates triggered by issue intake or drift intake

## Issue + Drift Intake Protocol (Mandatory for WhyCode repo work)

When implementing WhyCode repository changes:
- Start with open issue intake (new agent / agent update / policy-docs categorization).
- Include drift intake:
  - vendor docs or API contract changes
  - dependency/runtime version changes
  - repeated execution failures attributable to stale agent guidance
- Propose prioritized queue; execute selected items only.
- When implementing selected specialist-agent work, update specialist metadata and `lastVerifiedAt`.

---

## Autonomous Execution via whycode-loop

All agents execute autonomously using **whycode-loop** - a native iteration system that runs each iteration in a **fresh Claude context**.

**What whycode-loop provides:**
- Each iteration gets a **fresh 200k token context** (no degradation)
- Memory persists ONLY through **filesystem** (git, markdown, JSON state files)
- No external plugin dependency
- No cross-session bugs

**How it works:**
```
Orchestrator writes state → docs/whycode/loop-state/{plan-id}.json
         ↓
Task tool runs agent (fresh context)
         ↓
Agent reads state from files (PLAN.md, loop-state/)
         ↓
Agent works, writes result → docs/whycode/loop-state/{plan-id}-result.json
         ↓
Orchestrator reads result, verifies, loops or completes
```

**Key principles:**
1. **Fresh context per iteration** - you have NO memory of previous iterations
2. **Read ALL state from files** - PLAN.md, loop-state/, git log
3. **Write result file before exiting** - orchestrator reads it
4. **Orchestrator verifies externally** - don't lie about completion

---

## CRITICAL: Fresh Context Pattern

**You have NO MEMORY of previous iterations.** Every iteration starts with a clean context.

### At Start of Each Iteration (MANDATORY)

```
1. READ docs/whycode/loop-state/{plan-id}.json
   - See iteration history
   - Check lastVerificationFailure (fix this first!)

2. READ docs/whycode/PLAN.md
   - Your task specification
   - immutable-decisions, pm-commands

3. CHECK git log --oneline -10
   - See what previous iterations committed
   - Continue from where they left off

4. READ your agent definition
   - agents/{agent-type}.md
```

### At End of Each Iteration (MANDATORY - Before Exiting)

```
WRITE docs/whycode/loop-state/{plan-id}-result.json with JSON ONLY (no extra text). Notes <= 800 chars.
{
  "runId": "{runId}",
  "planId": "{plan-id}",
  "iteration": {N},
  "outcome": "PLAN_COMPLETE" | "PARTIAL_COMPLETE" | "incomplete" | "blocked",
  "tasksCompleted": ["task-001", "task-002"],
  "tasksPending": ["task-003"],
  "selfValidation": {
    "typecheck": { "status": "pass|fail", "exitCode": N },
    "lint": { "status": "pass|fail", "exitCode": N },
    "test": { "status": "pass|fail", "passed": N, "failed": N },
    "build": { "status": "pass|fail", "exitCode": N },
    "smoke": { "status": "pass|fail", "appStarted": true|false }
  },
  "filesChanged": { "created": [...], "modified": [...] },
  "requirements": [
    "Set TWILIO_ACCOUNT_SID",
    "Set TWILIO_AUTH_TOKEN"
  ],
  "notes": "Summary of what was done this iteration (<= 800 chars)"
}
```

**IF YOU DON'T WRITE THE RESULT FILE, THE ORCHESTRATOR ASSUMES YOU CRASHED.**
**DO NOT include raw command output in the result file.**

### Red Flags (Orchestrator Detects)

| Iterations | Task Count | Verdict |
|------------|------------|---------|
| 1 | 3+ tasks | SUSPICIOUS - too fast |
| = max | Any | HIT LIMIT - incomplete? |
| 1 | Complex task | SUSPICIOUS - verify output |
| No result file | Any | CRASHED - re-run |

---

## Agent Execution Protocol

All agents follow this protocol within **whycode-loop** (fresh context per iteration):

```
0. FRESH CONTEXT SETUP (MANDATORY - You have NO memory)

   a. READ docs/whycode/loop-state/{plan-id}.json
      - Check currentIteration, lastVerificationFailure
      - IF lastVerificationFailure exists: FIX THIS FIRST

   b. CHECK git log --oneline -10
      - See what previous iterations committed
      - Continue from where they left off

   c. READ your agent definition: agents/{agent-type}.md

1. READ docs/whycode/PLAN.md (XML format)

2. PARSE CONFIGURATION:
   - <immutable-decisions>: Use ONLY these technologies
   - <available-tools>: What integrations are enabled

3. FOR EACH <task> IN <tasks>:

   a. READ task requirements:
      - <name>: What to implement
      - <files>: Target files
      - <action>: Implementation steps
      - <verify>: Validation command
      - <done>: Success criteria

   b. PRE-FLIGHT CHECK (MANDATORY):
      - READ all <files> listed for the task
      - COMPARE current implementation against <done>
      - If <done> is already satisfied:
        * Mark task as complete in loop-state
        * Add a note: "Skipped (already implemented)"
        * DO NOT rewrite code
        * CONTINUE to next task

   c. IF <context7 enabled="true">:
      - mcp__context7__resolve-library-id("library-name")
      - mcp__context7__query-docs(library-id)
      - VERIFY methods exist before using them
      ELSE:
      - Proceed without Context7 and rely on local code/docs

   d. IMPLEMENT the task per <action>

   e. RUN <verify> command - MANDATORY, NOT OPTIONAL
      - CAPTURE exit code
      - IF exit_code != 0: DO NOT CONTINUE
      - Fix the issue and run <verify> again
      - REPEAT until <verify> passes

   f. ONLY AFTER <verify> passes:
      COMMIT:
      git add [<files>]
      git commit -m "feat({plan-id}): {task-name}"

   g. UPDATE loop-state task tracking:
      - READ docs/whycode/loop-state/{plan-id}.json
      - SET task.status = "done"
      - SET task.lastVerified = "{ISO timestamp}"
      - WRITE docs/whycode/loop-state/{plan-id}.json

   h. UPDATE LINEAR (if enabled):
      - Append a brief note to docs/whycode/audit/log.md
      - The orchestrator will update Linear

   i. DOCUMENT THE TASK:
      - CREATE docs/whycode/tasks/{plan-id}-{task-id}.md
      - APPEND to docs/whycode/audit/log.md
      - UPDATE CHANGELOG.md (unreleased section)

   j. APPLY DEVIATION RULES if needed:
      - Rule 1: Auto-fix bugs, document in task record
      - Rule 2: Auto-add security/correctness
      - Rule 3: Auto-fix blockers
      - Rule 4: STOP for architectural changes
      - Rule 5: Log enhancements to docs/whycode/ISSUES.md

4. FINAL VERIFICATION (MANDATORY BEFORE PLAN_COMPLETE):

   YOU MUST RUN ALL OF THESE. YOU CANNOT OUTPUT PLAN_COMPLETE UNTIL ALL PASS.

   a. TYPE CHECK:
      RUN: {pm} run typecheck OR tsc --noEmit
      REQUIRED: exit_code == 0
      IF FAILS: Fix and retry. DO NOT proceed.

   b. LINT:
      RUN: {pm} run lint
      REQUIRED: exit_code == 0
      IF FAILS: Fix and retry. DO NOT proceed.

   c. BUILD:
      RUN: {pm} run build
      REQUIRED: exit_code == 0
      IF FAILS: Fix and retry. DO NOT proceed.

   d. TESTS:
      RUN: {pm} run test
      REQUIRED: exit_code == 0, all tests pass
      IF FAILS: Fix and retry. DO NOT proceed.

   e. SMOKE TEST (CRITICAL - CATCHES RUNTIME ERRORS):
      RUN: Start the app with timeout (5-10 seconds)
      - Next.js: timeout 10s {pm} run dev 2>&1
      - Node: timeout 10s node {entrypoint} 2>&1
      - Python: timeout 10s python -m {module} 2>&1

      CHECK OUTPUT FOR:
      - "Error:" or "error:"
      - "Exception" or "exception"
      - "AttributeError", "TypeError", "ReferenceError"
      - "Cannot read property", "undefined is not"
      - Stack traces (lines with "at " followed by paths)

      REQUIRED: App starts without crashing
      IF CRASHES: Fix and retry. DO NOT proceed.

5. CHECKPOINT COMMIT (MANDATORY IF STUCK):

   If you fail verification **twice in a row** for the same plan:
   - Create a checkpoint commit with a clear reason, e.g.:
     `wip({plan-id}): checkpoint - typecheck failing`
   - Write the result file with `outcome: "incomplete"` and include the failure summary

6. PARTIAL COMPLETE MODE (If <completion-mode> is "partial"):

   Use this mode when external setup is missing (API keys, deployments, interactive setup).
   The goal is to make the code **build/typecheck clean** with safe guards.

   Rules:
   - Add runtime checks (env var guards) with clear error messages
   - Avoid calling external services at build time
   - Ensure typecheck/build pass with placeholders or stubs
   - Set `outcome` to `"PARTIAL_COMPLETE"` and list unmet requirements

5. ONLY AFTER ALL VERIFICATIONS PASS:
   - Append summary to docs/whycode/SUMMARY.md
   - UPDATE docs/whycode/features/{feature}.md

6. WRITE RESULT FILE (MANDATORY - Before exiting):

   WRITE docs/whycode/loop-state/{plan-id}-result.json:
   {
     "planId": "{plan-id}",
     "iteration": {currentIteration},
     "outcome": "PLAN_COMPLETE",
     "tasksCompleted": [...],
     "tasksPending": [],
     "taskStatus": [
       { "id": "task-001", "status": "done", "verifiedBy": "<verify>", "verifiedAt": "ISO" }
     ],
     "selfValidation": {
       "typecheck": { "status": "pass", "exitCode": 0 },
       "lint": { "status": "pass", "exitCode": 0 },
       "test": { "status": "pass", "passed": N, "failed": 0 },
       "build": { "status": "pass", "exitCode": 0 },
       "smoke": { "status": "pass", "appStarted": true }
     },
     "filesChanged": { "created": [...], "modified": [...] },
     "notes": "All tasks complete, all verifications pass"
   }

   ╔════════════════════════════════════════════════════════════════╗
   ║  YOU MAY ONLY SET outcome="PLAN_COMPLETE" IF ALL ARE TRUE:    ║
   ║                                                                ║
   ║  □ Every <verify> command returned exit_code 0                ║
   ║  □ Type check passed                                          ║
   ║  □ Lint passed                                                ║
   ║  □ Build succeeded                                            ║
   ║  □ All tests passed                                           ║
   ║  □ App runs without crashing (smoke test)                     ║
   ║                                                                ║
   ║  IF ANY VERIFICATION FAILS: FIX IT. DO NOT OUTPUT PLAN_COMPLETE║
   ║  You have {max_iterations} iterations. Use them.              ║
   ╚════════════════════════════════════════════════════════════════╝
```

---

## Standard Agent Prompt (whycode-loop)

This is the prompt agents receive when run via whycode-loop. Each iteration gets fresh context.

```
You are executing plan {plan-id}, iteration {N}.

⛔ FRESH CONTEXT - You must read ALL state from files. You have no memory of previous iterations.

## MANDATORY SETUP (DO NOT SKIP)

1. READ docs/whycode/loop-state/{plan-id}.json - Iteration history, previous failures
2. READ docs/whycode/PLAN.md - Your task specification
3. READ your agent definition from agents/{agent-type}.md
4. READ docs/whycode/reference/AGENTS.md - Execution protocol
5. CHECK git log --oneline -10 - See what previous iterations committed

## PREVIOUS ITERATION INFO (if applicable)

⚠️ If lastVerificationFailure exists in loop-state, FIX THAT FIRST.

## EXECUTION

1. Check what tasks are complete (via git log, loop-state)
2. Continue from where the last iteration left off
3. For each incomplete task:
   a. Implement the task per <action>
   b. Run <verify> command - MUST pass
   c. If fails, fix and retry
   d. Commit when passing

## MANDATORY VERIFICATION (BEFORE CLAIMING COMPLETE)

Run ALL of these - they MUST pass:
□ {pm} run typecheck  → exit code 0
□ {pm} run lint       → exit code 0
□ {pm} run test       → all tests passing
□ {pm} run build      → exit code 0
□ SMOKE TEST: Run app for 5-10 seconds - must not crash

## MANDATORY OUTPUT (BEFORE EXITING)

You MUST write docs/whycode/loop-state/{plan-id}-result.json with:
{
  "planId": "{plan-id}",
  "iteration": {N},
  "outcome": "PLAN_COMPLETE" | "incomplete" | "blocked",
  "tasksCompleted": [...],
  "tasksPending": [...],
  "selfValidation": { ... },
  "filesChanged": { "created": [...], "modified": [...] },
  "notes": "..."
}

The orchestrator VERIFIES externally after you claim PLAN_COMPLETE.
If verification fails, you'll be run again with the error in lastVerificationFailure.
```

---

## TDD Agent Prompt (whycode-loop)

TDD agents follow the same fresh-context pattern with Red-Green-Refactor protocol.

```
You are executing a TDD plan {plan-id}, iteration {N}.

⛔ FRESH CONTEXT - Read ALL state from files.

## MANDATORY SETUP

1. READ docs/whycode/loop-state/{plan-id}.json - Check lastVerificationFailure
2. READ docs/whycode/PLAN.md - Task specification
3. READ agents/test-agent.md - Your agent definition
4. CHECK git log --oneline -10 - See previous work

## TDD PROTOCOL (Red-Green-Refactor)

FOR EACH incomplete <task>:

  RED:
  - Write failing test based on <done> criteria
  - RUN tests - MUST fail (confirms test is valid)
  - git commit -m "test({plan-id}): add failing test for {task-name}"

  GREEN:
  - Implement minimal code from <action>
  - RUN tests - MUST pass
  - IF tests fail: FIX and retry
  - git commit -m "feat({plan-id}): implement {task-name}"

  REFACTOR:
  - Clean up if needed
  - RUN tests - MUST still pass
  - git commit -m "refactor({plan-id}): clean up {task-name}"

## MANDATORY VERIFICATION

□ {pm} run typecheck → must pass
□ {pm} run lint      → must pass
□ {pm} run test      → ALL tests must pass
□ {pm} run build     → must pass
□ SMOKE TEST         → App runs without crashing

## MANDATORY OUTPUT

WRITE docs/whycode/loop-state/{plan-id}-result.json with outcome and selfValidation.
```

---

## Documentation Agent Prompt (whycode-loop)

Documentation agents verify all code examples work before claiming completion.

```
You are a documentation agent executing iteration {N}.

⛔ FRESH CONTEXT - Read ALL state from files.

## MANDATORY SETUP

1. READ docs/whycode/loop-state/{plan-id}.json - Check previous iteration status
2. READ docs/whycode/reference/TEMPLATES.md - Document formats
3. READ agents/docs-agent.md - Your agent definition

## DOCUMENTATION PROTOCOL

1. Read context from:
   - docs/whycode/PROJECT.md (vision)
   - docs/whycode/ROADMAP.md (phases)
   - docs/whycode/SUMMARY.md (what was built)
   - Source code files

2. FOR EACH documentation task:
   a. Gather relevant information
   b. Generate/update the document
   c. Use templates from TEMPLATES.md
   d. VERIFY any code examples or commands work
   e. git commit -m "docs({scope}): {description}"

DOCUMENTS TO GENERATE:
- README.md (project overview, setup, usage)
- CHANGELOG.md (Keep a Changelog format)
- CONTRIBUTING.md (dev setup, standards)
- docs/api/*.md (API documentation)
- docs/DEPLOYMENT.md (deployment guide)

## VERIFICATION

□ All install commands work
□ All run commands work
□ Code examples are syntactically correct
□ Links are valid

## MANDATORY OUTPUT

WRITE docs/whycode/loop-state/{plan-id}-result.json with outcome.
```

---

## Linear Integration in Agents

When `<linear enabled="true">` in the plan:

```
# Agents do NOT call Linear directly in this build.
# Log task start/finish to docs/whycode/audit/log.md and include the linear-id.
# The orchestrator handles Linear updates.
```

---

## Specialized Agent Types

| Agent | Use Case | Special Capabilities |
|-------|----------|---------------------|
| `general-purpose` | Standard implementation | All enabled tools |
| `whycode:test-agent` | TDD plans | Test runners, TDD protocol |
| `whycode:frontend-agent` | UI work | frontend-design skill |
| `whycode:backend-agent` | API/DB work | Database tools |
| `whycode:docs-agent` | Documentation | Document generation |

All agents follow the same XML plan format and execution protocol.

---

## IMMUTABLE_DECISIONS Enforcement

**AGENTS MUST:**
- Check `<immutable-decisions>` before any implementation
- Use EXACTLY the technologies specified
- Use ONLY commands from `<pm-commands>`

**AGENTS MUST NEVER:**
- Substitute a different package manager
- Use a different library because it's "better"
- Change any user-specified technology choice

**VIOLATIONS ARE TASK FAILURES.**
