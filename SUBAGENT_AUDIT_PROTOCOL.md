# SUBAGENT_AUDIT_PROTOCOL.md

The standard protocol every subagent follows for **session identity, audit ledger writes, slug propagation, and iteration-count derivation**. Centralized here so 15 agents reference one spec instead of duplicating boilerplate 15 times.

Lazy-loaded — agents read this file only when they're about to perform one of the protocol steps (not on every invocation). The orchestrator does NOT load this file; orchestrator-side audit rules live in `orchestrator.md` directly.

## When subagents follow this protocol

Every Agent Harry subagent (`discovery-researcher`, `competitive-analyst`, `product-positioner`, `feature-prioritizer`, `ideation-facilitator`, `lo-fi-designer`, `design-engineer`, `usability-tester`, `handoff-engineer`, `pm-strategist`, `pm-launch-architect`, `pm-metrics-architect`, `prd-author`, `critique-partner`) follows these steps as part of its Output Format. The orchestrator handles its own routing-event ledger writes separately.

## Step 1 — Establish session identity at intake

Subagents need `session_id`, `project_slug`, and `feature_slug` to produce a complete handoff artifact and to append correctly to the audit ledger.

### `session_id` derivation (read-only — never invent)

1. Read `<project-root>/.harry-audit.jsonl` if it exists.
2. Find the latest entry's `session_id`.
3. If the orchestrator's invocation prompt to you contains an explicit `session_id: s_YYYYMMDD_NNNN` line, use that — it overrides any inference.
4. If neither — you're being invoked directly without orchestrator context. Generate a new session_id:
   - Compute today's UTC date `YYYYMMDD`
   - Find the highest `_NNNN` suffix for today's date in the existing ledger
   - Increment by one (or start at `_0001` if no entries today)
   - Use format `s_YYYYMMDD_NNNN`

Persist the chosen `session_id` in your handoff frontmatter.

### `project_slug` derivation

1. Check the orchestrator's invocation prompt for an explicit `project_slug: <slug>` line — use it.
2. Otherwise, read prior handoff artifacts in `./design-workspace/<project-slug>/` — the latest artifact's frontmatter `project_slug:` field is authoritative.
3. Otherwise, derive from `<cwd>` basename, kebab-case (e.g. `cwd = /Users/.../my-checkout-app` → `project_slug = my-checkout-app`).
4. Otherwise (rare — direct invocation with no prior artifacts), ask the user at intake: *"What's the project slug for this feature? (kebab-case, used in file paths.)"*

### `feature_slug` derivation

1. Check the orchestrator's invocation prompt for an explicit `feature_slug: <slug>` line — use it.
2. Otherwise, if you're a downstream agent reading an upstream handoff (e.g. `design-engineer` reading `lo-fi-<feature-slug>.md`), extract from the frontmatter you just read.
3. Otherwise (no upstream handoff yet), derive from the user's goal as kebab-case. Example: *"build checkout flow"* → `feature_slug = checkout`. Trim filler words ("the", "new", "flow") — `feature_slug = checkout`, not `the-new-checkout-flow`.
4. ALWAYS surface the derived `feature_slug` in your Executive Summary so the user can `revise` if it's wrong before downstream agents lock it in.

## Step 2 — Append your `stop_gate` entry to the audit ledger

You own the `stop_gate` event for your own run. Orchestrator-level events (`gate_block`, `gate_clear`, `pivot`, `cancel`) are NOT yours — orchestrator writes those.

### When to append

After producing your handoff artifact AND printing the Executive Summary, but BEFORE printing the Always-On Stop Gate prompt. The ledger entry reflects your COMPLETED work, not the user's pending decision.

### What to append

One JSON object, one line, newline-terminated, appended to `<project-root>/.harry-audit.jsonl`. Schema:

```json
{
  "ts": "<ISO 8601 UTC>",
  "session_id": "<from Step 1>",
  "project_slug": "<from Step 1>",
  "feature_slug": "<from Step 1, or null if N/A>",
  "agent": "<your agent name, e.g. 'design-engineer'>",
  "mode": "A | B | null",
  "phase": "discovery | define | deliver | cross-cutting",
  "event": "stop_gate",
  "decision": null,
  "cost_delta": <estimated USD for this run>,
  "files_written": ["<relative path>", ...],
  "handoff_ref": "<relative path to your handoff artifact>"
}
```

Note: `decision` is `null` at the moment YOU write the entry. The user hasn't replied to your Stop Gate yet. The decision (`y` / `revise` / `pivot` / `cancel`) is captured by the orchestrator's NEXT entry (a `pivot` or `cancel` event) or by the next subagent's invocation (which implies the user typed `y`). Do NOT block your write waiting for the user.

### `files_written` field

List relative paths (from project root) of files you wrote OR edited during this run. Include:
- Your handoff artifact path (always)
- Any code files you produced (e.g. `prototypes/checkout/page.tsx`)
- Any new Figma files you created (use the Figma URL, not a relative path — it's a URL, but include for traceability)

Cap at 10 entries. If more, list the 9 most-important + a summary entry `"+N more files"`. Engineers reading the audit log care about which files THEY need to look at, not exhaustive lists.

### Other event types you may append

- `scope_refused` — you refused the user's request because it exceeded a scope cap (e.g. `design-engineer` 1-flow-per-invocation cap). Set `event: "scope_refused"`, add `"cap_hit": "<rule-name>"`.
- `iteration_cap_hit` — you reached an iteration soft cap (see Step 3). Set `event: "iteration_cap_hit"`, add `"cap_hit": "<rule-name>"`. This is a self-flag — your handoff also tells the user "consider pivot back to upstream agent".

### Append discipline

- Append-only. Never rewrite existing lines.
- One line, terminated by `\n`. No pretty-printing.
- If `.harry-audit.jsonl` doesn't exist, create it.
- **Graceful degrade**: if writing the ledger fails (disk full, permission), do NOT block your Stop Gate. The Stop Gate is load-bearing; the ledger is observability. Print a one-line warning to chat and continue.

## Step 3 — Derive iteration count (where applicable)

Some agents have iteration soft caps (e.g. `design-engineer` 3-revise cap before suggesting pivot). The cap is enforced by reading the audit ledger — NOT by stored state.

### Algorithm

1. Read `<project-root>/.harry-audit.jsonl`.
2. Filter entries: `session_id == <yours> AND agent == <you> AND feature_slug == <yours>`.
3. Walk backward from the latest entry. Count consecutive entries with `decision == "revise"`.
4. Stop counting when you hit an entry with `decision IN ("y", "pivot", "cancel", null)` or no more entries for this scope.
5. The count is the iteration number for your CURRENT run (so if 2 prior revises in a row → this is iteration 3).

### What to do with the count

- Surface in your Executive Summary: `Iteration: N of <cap>`.
- If `N >= cap` (e.g. `N >= 3` for `design-engineer`), append a `iteration_cap_hit` event AND change your suggested next-step to recommend pivot back to the upstream agent.

### Per-session vs per-feature semantics

Filter by BOTH `session_id` AND `feature_slug`. Reasoning:
- Cross-session = fresh budget (user came back next day, gets new 3 revises).
- Same session different feature = independent budgets (designing checkout AND search in one session — each gets its own 3-revise budget).

## Step 4 — Required handoff frontmatter fields

In addition to the existing handoff schema in `SHARED_CONTEXT.md`, your handoff artifact frontmatter MUST include:

```yaml
---
agent: <your name>
phase: <your phase>
project_slug: <from Step 1>
feature_slug: <from Step 1, or null if cross-feature work>
session_id: <from Step 1>
started: <ISO 8601 UTC>
completed: <ISO 8601 UTC>
inputs_used:
  - <file or context source>
files_written:
  - <relative path>
confidence: high | medium | low
open_questions:
  - <question that blocks next phase>
recommended_next_agent: <agent-name or "user-decision">
tokens_estimated: <rough number>
---
```

The renamed `project_slug:` replaces the v3.7-and-earlier `project:` field (rename for clarity — the value has always been a slug).

## Anti-patterns

- Inventing a new `session_id` mid-session when the orchestrator already established one — read the ledger / invocation prompt FIRST
- Slugifying user goals differently in different agents (e.g. `feature_slug = checkout-flow` in one agent, `feature_slug = checkout` in another) — pick once at the upstream agent, propagate via frontmatter
- Writing `iteration_cap_hit` events without ALSO surfacing the cap in your Executive Summary — silent enforcement is worse than no enforcement
- Listing every file in `files_written` when only 2–3 matter — keep the list scannable
- Reading the full audit ledger long-form into context — only the last ~50 entries are usually relevant; tail-read if needed
- Appending the ledger entry AFTER the Stop Gate prompt (must be before — the entry reflects completed work, not pending user decision)

## What the orchestrator does separately

The orchestrator is the ONLY writer for these events (subagents do NOT write these):

- `gate_block` — Research-First or Success-Metrics Gate refusal
- `gate_clear` — a previously-blocking gate transitioned to passed
- `pivot` — user typed `pivot — <new direction>` at a Stop Gate
- `cancel` — user typed `cancel` / `stop` / `ရပ်`

The orchestrator's audit-write rules live in `orchestrator.md` § Audit Ledger Write. As a subagent you don't need to know them — they don't affect what you do.
