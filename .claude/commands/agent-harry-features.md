---
description: List all features ever worked on in this project, derived from the audit ledger (.harry-audit.jsonl). No separate registry file — the ledger is the single source of truth. Default scope: all features ever touched, current project. Status is inferred from the most recent event per feature_slug.
argument-hint: "[<slug> | --recent N | --days N | --status <active|stale|null>]"
---

# /agent-harry-features

Render a derived view of every `feature_slug` ever recorded in `<project-root>/.harry-audit.jsonl`. This command is a **read-only projection** over the ledger — it does NOT create or maintain a separate registry file. The ledger is the source of truth (see `SHARED_CONTEXT.md` § Audit Ledger).

## Why this exists (v5.1)

Before v5.1, "what features have I designed in this project?" required either scrolling `design-workspace/<project-slug>/` by hand or grepping the ledger. At small scale (under ~10 features) the folder scan was fine. At larger scale it became friction. This command is the targeted fix — no new storage, no new schema, just a query.

## What this command does

1. Read `<project-root>/.harry-audit.jsonl` (refuse cleanly if missing — same pattern as `/agent-harry-audit`).
2. Parse args from `$ARGUMENTS`.
3. Group entries by `feature_slug` (skip entries where `feature_slug` is `null` — those are cross-feature work, see § Cross-feature work below).
4. For each feature group, derive: first-seen, last-touched, agents involved, total `cost_delta` sum, latest handoff path, and an **inferred status** (see § Status inference).
5. Render as a markdown table grouped by status, sorted by `last_touched` descending within each group.
6. Print to chat (no file write — render is ephemeral, identical principle to `/agent-harry-audit`).

## Argument parsing

`$ARGUMENTS` may contain any combination of these flags (whitespace-separated, order-independent):

| Flag / form | Effect | Default |
|---|---|---|
| `<slug>` (bare word, no `--` prefix) | Detail view for one feature — full timeline + agents touched + files written + cost | list mode |
| `--recent N` | Show only the N most recently touched features | show all |
| `--days N` | Show only features touched in the last N days | show all |
| `--status <active\|stale\|null>` | Filter by inferred status (see below) | all statuses |

Multiple filters AND together (`--days 30 --status active` = active features touched in the last 30 days).

If no args: render all features grouped by status (active first, then stale, then null), no time filter.

## Status inference (read-only — no `deprecated` lifecycle in v5.1)

Status is **derived** from ledger contents at render time. There is no `feature_status` field in the schema and no `/agent-harry-features deprecate <slug>` write command. v5.1 deliberately defers lifecycle gates — they are reconsidered when a user actually reports friction with deprecated features cluttering output (see `CHANGELOG.md` v5.1 entry).

| Inferred status | Definition |
|---|---|
| `active` | Most recent event for this `feature_slug` is within the last 30 days |
| `stale` | Most recent event is older than 30 days but the feature has at least one Deliver-phase artifact |
| `null` | Feature_slug appeared in the ledger but no Deliver-phase agent ever produced a handoff (e.g. orchestrator routed, then user cancelled) |

Edge case — pivot/cancel: if a feature's most recent event is `cancel` AND no later events follow, surface in `null` group with a `_cancelled_` marker, not `stale`. This prevents zombie features cluttering `stale`.

## Cross-feature work (excluded from default view)

Entries with `feature_slug: null` are project-level work (e.g. `product-fingerprint-curator`, `figma-component-bootstrapper` create mode, `pm-strategist` cross-feature runs). These are NOT features and are excluded from the default list. Use `/agent-harry-audit` to see them.

## Steps to execute

1. Use `Bash` to check that `<cwd>/.harry-audit.jsonl` exists. If not, print:
   ```
   No audit ledger found at .harry-audit.jsonl yet.
   Run any Agent Harry pipeline step on a feature and the ledger will be created at the first Stop Gate.
   ```
   and exit.
2. Read the file with `Read` (or `Bash` + `cat` if file is large — > 1MB).
3. Parse each line as JSON. Skip malformed lines silently (log count in footer).
4. Filter out `feature_slug: null` entries.
5. Group by `feature_slug`.
6. For each group, compute the derived columns (see § Output format below).
7. Apply user filters (`--recent`, `--days`, `--status`).
8. If a positional `<slug>` was passed, switch to detail mode (see § Detail mode below).
9. Render.

## Output format — list mode (default)

```markdown
# Features in <project_slug>
**Scope:** <one-line scope description — e.g. "All features · current project · all statuses">
**Total:** <N> features (<M> active · <K> stale · <L> null)
**Filters applied:** <list of flags, or "(none)">

---

## Active (touched in last 30 days)

| Feature | First seen | Last touched | Agents | Total cost | Latest handoff |
|---|---|---|---|---|---|
| `<feature_slug>` | YYYY-MM-DD | YYYY-MM-DD (Nd ago) | <comma list, max 4 + "…"> | $<sum> | <relative path> |
| ... | ... | ... | ... | ... | ... |

## Stale (no activity >30 days, but has Deliver artifacts)

| Feature | First seen | Last touched | Agents | Total cost | Latest handoff |
|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... |

## Null (started but no Deliver artifact — includes _cancelled_)

| Feature | First seen | Last event | Last event type | Total cost |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

---

**Footer:**
- Features in scope: <N>
- Skipped malformed lines: <K> (if any)
- Ledger path: `<project-root>/.harry-audit.jsonl`
- For a single feature's full timeline: `/agent-harry-features <slug>`
- For cross-feature (project-level) work: `/agent-harry-audit`
```

## Output format — detail mode (`/agent-harry-features <slug>`)

When the first positional arg looks like a feature slug (no `--` prefix), render a single-feature deep view:

```markdown
# Feature: `<feature_slug>` in <project_slug>

| Field | Value |
|---|---|
| Status (inferred) | active / stale / null |
| First seen | <ISO date> (Session `<id>`) |
| Last touched | <ISO date> (Nd ago) |
| Sessions involved | <count> |
| Agents touched | <comma list, all of them> |
| Total cost (cost_delta sum) | $<X.XX> |
| Latest handoff artifact | <relative path> |
| All handoff artifacts | <list of relative paths, one per line> |

## Timeline

| Date | Session | Agent | Event | Decision | Cost |
|---|---|---|---|---|---|
| YYYY-MM-DD HH:MM UTC | <session_id> | <agent> | <event> | <decision or "—"> | $<cost_delta> |
| ... | ... | ... | ... | ... | ... |

## Files written (deduplicated)

- <relative path>
- ...

---

**To replay this feature's full audit:** `/agent-harry-audit --session <each session_id, comma-joined>`
```

## Hard rules

- **Do NOT mutate the ledger.** This command is read-only. Never write, rename, or truncate `.harry-audit.jsonl`.
- **Do NOT create a `_features.yaml` or any registry file.** v5.1 explicitly rejected a separate registry — the ledger is the single source of truth. Maintaining two sources causes drift.
- **Render to chat only.** No `.md` file written — the render is ephemeral by design.
- **No write commands in v5.1.** There is no `/agent-harry-features deprecate <slug>` or `/agent-harry-features rename`. Lifecycle gates are deferred until users actually report friction.
- **Per-project scope.** This command does NOT aggregate across multiple Agent Harry projects. Same reasoning as `/agent-harry-audit` — see `SHARED_CONTEXT.md` § "No workspace-wide aggregation."
- **Performance.** If the ledger has >1000 entries AND user passed no filters, default to the most recent 50 features by `last_touched`; mention the truncation in the scope line and tell user to filter with `--days N` or `--status` to broaden.
- **Privacy reminder.** If user is in a public/recorded context, note in footer: `⚠ Feature names + paths may be private — don't paste this output publicly without redacting.`

## Anti-patterns

- Persisting computed status to disk (would re-introduce the drift problem v5.1 rejected)
- Synthesizing a `brief` field from PRD first lines and caching it (PRDs evolve; cache would drift — read PRD on demand in detail mode if needed)
- Aggregating across multiple projects (per-project scope is deliberate)
- Treating absence from the list as "feature doesn't exist" (the user may have features in `design-workspace/` that predate ledger v3.8 — surface this caveat in the footer if zero features matched)
- Defaulting to a hidden `--status active` filter (users expect "all features" by default; if active-only is wanted, type the flag)

## When to invoke

- *"What features have I designed in this project?"* — `/agent-harry-features`
- *"Show me the checkout feature's full timeline"* — `/agent-harry-features checkout`
- *"What did I touch this week?"* — `/agent-harry-features --days 7`
- *"Just the most recent 10 features"* — `/agent-harry-features --recent 10`
- *"Which features got abandoned mid-pipeline?"* — `/agent-harry-features --status null`

## Cost expectation

- Pure read + render. ~$0 — the model just parses JSON and formats markdown.
- Detail mode on a feature with many sessions may load more context (~200–500 tokens of ledger entries), still effectively free.

## Relationship to other commands

| Command | What it shows | When to use it |
|---|---|---|
| `/agent-harry-features` | One row per feature, status + last touched | "What features exist?" |
| `/agent-harry-features <slug>` | Full timeline of one feature | "What happened to feature X?" |
| `/agent-harry-audit` | Every event across all features | "What did Agent Harry do yesterday?" |
| `/agent-harry-cost` | Cost rollup by session/agent | "How much did this cost?" |

They share the same source file (`.harry-audit.jsonl`) and read-only contract.
