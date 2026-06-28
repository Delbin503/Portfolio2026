---
description: Render the Agent Harry audit ledger (.harry-audit.jsonl) as a human-readable markdown timeline. Shows what each agent did, when, what was decided, and which files were impacted. Default scope: last 7 days, current project, all events.
argument-hint: "[--all | --days N | --agent <name> | --event <type> | --session <s_...>]"
---

# /agent-harry-audit

Render the project's `.harry-audit.jsonl` as a markdown timeline. The ledger schema is defined in `SHARED_CONTEXT.md` § Audit Ledger.

## What this command does

1. Read `<project-root>/.harry-audit.jsonl` (if missing, report "no ledger yet" and exit cleanly)
2. Parse args from `$ARGUMENTS` to determine scope + filters
3. Filter entries by scope + flags
4. Render as a markdown timeline grouped by date → table per session
5. Print to chat (no file write — render is ephemeral)

## Argument parsing

`$ARGUMENTS` may contain any combination of these flags (whitespace-separated, order-independent):

| Flag | Effect | Default |
|---|---|---|
| `--all` | Show entire ledger; ignores `--days` | (default 7 days) |
| `--days N` | Show last N days (UTC) | 7 |
| `--agent <name>` | Filter to entries where `agent == <name>` | all agents |
| `--event <type>` | Filter to entries where `event == <type>` (e.g. `pivot`, `gate_block`) | all events |
| `--session <s_id>` | Filter to one specific `session_id` | all sessions in scope |

Multiple filters AND together (`--days 30 --agent design-engineer --event stop_gate` = design-engineer stop_gate events in the last 30 days).

If no args: render last 7 days, all sessions, all events.

## Steps to execute

1. Use `Bash` to check that `<cwd>/.harry-audit.jsonl` exists. If not, print:
   ```
   No audit ledger found at .harry-audit.jsonl yet.
   Run any Agent Harry pipeline step (orchestrator or a subagent) and the ledger will be created at the first Stop Gate.
   ```
   and exit.
2. Read the file with `Read` (or `Bash` + `cat` if file is large — > 1MB).
3. Parse each line as JSON. Skip malformed lines silently (log count in footer).
4. Apply filters per args.
5. Group filtered entries by UTC date (`YYYY-MM-DD`), then by `session_id` within each date.
6. Render in the format below.

## Cumulative cost — computed on read, not stored (v3.8)

The ledger schema does NOT store `cumulative_cost` per entry — orchestrator and subagents are stateless across invocations, so storing a running total would drift. Instead, **this command computes session totals at render time** by grouping entries by `session_id` and summing each session's `cost_delta` values. The "Total" footer and per-session `$<session-cost>` in the output below are both derived sums, not stored fields.

## Output format

```markdown
# Agent Harry Audit Log
**Scope:** <one-line scope description — e.g. "Last 7 days · current project · all events">
**Total:** <N> events across <M> sessions · cumulative cost $<X.XX> (summed from cost_delta)
**Filters applied:** <list of flags, or "(none)">

---

## <YYYY-MM-DD (today / yesterday / weekday)> — Session <session_id> — $<session-cost-sum>

| Time (UTC) | Agent | Event | Decision | Cost | Files written |
|---|---|---|---|---|---|
| <HH:MM> | <agent> (Mode <A/B>, <phase>) | <event> | <decision or "—" or "(pending)" if null> | $<cost_delta> | <comma-separated files_written paths, truncated to 60 chars per cell> |
| ... | ... | ... | ... | ... | ... |

<repeat session table for each session on this date>

## <next earlier date> — Session <id> — $<cost-sum>
...

---

**Footer:**
- Sessions in scope: <M>
- Skipped malformed lines: <N> (if any)
- Ledger path: `<project-root>/.harry-audit.jsonl`
- To see the full ledger raw: `cat .harry-audit.jsonl | jq`
```

**Note on `decision` field:** a subagent's `stop_gate` entry has `decision: null` because the user hasn't replied yet. Render as `(pending)` if the entry is the most recent for its session, otherwise `—`. Orchestrator's `pivot` / `cancel` entries always have a decision-implied semantic — render the event name (e.g. `pivot`, `cancel`).

### Event-specific row decoration

| event | Row formatting hint |
|---|---|
| `stop_gate` | normal row |
| `gate_block` | append `(gate: <gate>, reason: <reason>)` in Decision column |
| `gate_clear` | append `(gate: <gate> cleared)` in Decision column |
| `pivot` | Decision column shows `pivot → <delta_text>` (truncated to 50 chars) |
| `cancel` | row uses muted styling — italic if possible, or `_cancelled_` in Decision |
| `scope_refused` | Decision column shows `scope refused: <cap_hit>` |
| `iteration_cap_hit` | Decision column shows `iter cap hit: <cap_hit>` |

### Date grouping rules

- Group by UTC date (the `ts` field's date component).
- Most recent date first. Within each date, most recent session first. Within each session, chronological order.
- Use friendly labels for today/yesterday: `## 2026-05-22 (today) — ...`, `## 2026-05-21 (yesterday) — ...`.

## Hard rules

- **Do NOT mutate the ledger.** This command is read-only. Never write, rename, or truncate `.harry-audit.jsonl`.
- **Render to chat only.** Don't write a `.md` file — the render is ephemeral by design.
- **Privacy reminder.** If the user is in a public/recorded context, note in the footer: `⚠ Ledger may contain private paths — don't paste this output publicly without redacting.`
- **Performance.** If the ledger has > 1000 entries AND user passed no filters AND no `--all` flag, default to last 7 days; mention in scope line.
- **Truncation.** Cap each table at 30 rows; if more, surface the most recent 30 and tell user to filter further or use `--all`.

## Anti-patterns

- Auto-applying filters the user didn't request (e.g. silently dropping `gate_block` events because they're "noise" — they're often the most important entries)
- Rendering the full ledger when only the last 7 days were asked for
- Loading the entire ledger long-form into context when a streaming/line-by-line parse would do
- Aggregating across multiple projects (per-project scope is a deliberate decision — see `SHARED_CONTEXT.md`)

## When to invoke

- *"What did Agent Harry do yesterday?"* — `/agent-harry-audit --days 1`
- *"Show me all the times I pivoted this month"* — `/agent-harry-audit --days 30 --event pivot`
- *"What did design-engineer do this week?"* — `/agent-harry-audit --agent design-engineer`
- *"Replay everything in session s_20260522_0001"* — `/agent-harry-audit --session s_20260522_0001`
- *"Total cost across all my Agent Harry runs"* — `/agent-harry-audit --all` (read the footer cumulative total)
