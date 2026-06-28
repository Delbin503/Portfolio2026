---
description: Report real Agent Harry costs from token_usage events in .harry-audit.jsonl. Reads measured tokens (input / cache_read / cache_write / output) per model and aggregates cost by model, by phase, and by Claude Code session window. Falls back to self-estimated cost_delta when no token_usage event has been logged for a given run.
argument-hint: "[--all | --days N | --by-agent | --by-model | --json]"
---

# /agent-harry-cost

Aggregate cost from `<project-root>/.harry-audit.jsonl`. Prefers `token_usage` events (measured) over `stop_gate.cost_delta` (estimated). See `SHARED_CONTEXT.md` § Cost field semantics (v4.1).

## What this command does

1. Read `<project-root>/.harry-audit.jsonl` (if missing, report "no ledger yet" and exit cleanly).
2. Suggest running the logger if the ledger has `stop_gate` events but zero `token_usage` events: `python3 scripts/log-tokens.py`.
3. Aggregate `token_usage` events by model, by phase, and by `cc_session_id` window.
4. For each `stop_gate` entry that has NO matching `token_usage` (by `linked_to_ts` or temporal overlap with a `cc_window`), include its self-estimated `cost_delta` and tag it as ESTIMATED in the output.
5. Print a markdown report. Read-only — never mutate the ledger.

## Argument parsing

| Flag | Effect | Default |
|---|---|---|
| `--all` | Entire ledger | (last 30 days) |
| `--days N` | Last N days (UTC, by `ts`) | 30 |
| `--by-agent` | Add a per-agent breakdown table | off |
| `--by-model` | Add a per-model breakdown table | on (default) |
| `--json` | Emit raw aggregate as JSON instead of markdown | off |

## Steps to execute

1. `Bash`: check `<cwd>/.harry-audit.jsonl` exists. If not, print:
   ```
   No audit ledger found at .harry-audit.jsonl yet.
   Run any Agent Harry pipeline step to create one, then re-run /agent-harry-cost.
   To capture REAL token costs from past sessions, run: python3 scripts/log-tokens.py
   ```
   Exit.
2. `Read` (or `Bash` + line-by-line parse if large). Parse each line as JSON; skip malformed.
3. Apply `--days` / `--all` filter on `ts`.
4. Split entries into two buckets:
   - `token_usage` events → authoritative measured cost
   - `stop_gate` events → fallback estimate (only if no matching `token_usage`)
5. Aggregate:
   - **Total measured** = Σ `cost_usd` across `token_usage` events
   - **Total estimated** = Σ `cost_delta` from unmatched `stop_gate` events
   - **Total combined** = measured + estimated, with confidence note
6. Render markdown (or JSON if `--json`).

## Output format

```markdown
# Agent Harry Cost Report
**Scope:** <scope description — e.g. "Last 30 days · project: my-app">
**Combined total:** $<X.XX>  ($<measured> measured · $<estimated> estimated fallback)
**Coverage:** <N> agent runs measured · <M> agent runs estimated-only · <P>% measured

> If measured coverage is < 80%, run `python3 scripts/log-tokens.py` to capture real
> numbers for past sessions before relying on this report.

---

## By model (measured)

| Model | Runs | Input | Cache read | Cache write | Output | Cost |
|---|---:|---:|---:|---:|---:|---:|
| claude-opus-4-7 | <n> | <tokens> | <tokens> | <tokens> | <tokens> | $<cost> |
| claude-sonnet-4-6 | ... | ... | ... | ... | ... | $... |
| **TOTAL** | | | | | | **$<total-measured>** |

## By Claude Code session (measured)

| cc_session_id | Window (UTC) | Models | Messages | Cost |
|---|---|---|---:|---:|
| <truncated-uuid> | <start> → <end> | <model-list> | <count> | $<cost> |
| ... | ... | ... | ... | ... |

## Estimated-only entries (no transcript measurement yet)

| Date | Agent | Phase | Estimated cost |
|---|---|---|---:|
| <ts> | <agent> | <phase> | $<cost_delta> |
| ... | ... | ... | ... |
| **Subtotal** | | | **$<sum>** |

---

**Footer:**
- Ledger path: `<project-root>/.harry-audit.jsonl`
- Pricing table source: `scripts/log-tokens.py` (PRICING dict)
- To refresh measurements: `python3 scripts/log-tokens.py --force`
```

If `--by-agent` is passed, add this section after By model:

```markdown
## By agent (measured + estimated combined)

| Agent | Runs | Measured | Estimated | Total |
|---|---:|---:|---:|---:|
| design-engineer | <n> | $<m> | $<e> | $<t> |
| ... | ... | ... | ... | ... |
```

## Linking token_usage to stop_gate

A `token_usage` event with `linked_to_ts: <iso-ts>` references a specific `stop_gate` event by its `ts`. Currently `log-tokens.py` does NOT populate `linked_to_ts` — the transcript doesn't expose enough metadata to correlate one-to-one with a specific Agent Harry subagent invocation — so all token_usage entries appear as `main-thread` or `subagent-aggregate` rollups per Claude Code session.

To present a complete picture:
- Group `token_usage` events by `cc_session_id` (Claude Code session UUID).
- Find `stop_gate` events whose `ts` falls within the `cc_window_start` → `cc_window_end` of any `token_usage` entry.
- Mark those `stop_gate` entries as "covered by transcript measurement" — their `cost_delta` is treated as superseded and excluded from the estimated subtotal.
- Remaining `stop_gate` entries (no covering measurement) are listed in the Estimated-only table.

## Hard rules

- **Read-only.** Never mutate the ledger.
- **Render to chat only.** Don't write a .md file.
- **Privacy.** Ledger contains paths, Figma URLs, decision deltas — don't paste output publicly without redacting.
- **No telemetry.** This command never sends data anywhere; all aggregation is local.

## Anti-patterns

- Double-counting: summing `token_usage.cost_usd` AND every overlapping `stop_gate.cost_delta` for the same run. Always treat measured as authoritative; only count estimates that have no measurement coverage.
- Showing cents without coverage context — a "$0.84" total with 10% measured coverage is mostly fictional.
- Aggregating across multiple projects (per-project scope is deliberate — see `SHARED_CONTEXT.md`).

## When to invoke

- *"How much have I spent on Agent Harry this month?"* — `/agent-harry-cost --days 30`
- *"Which model is eating the budget?"* — `/agent-harry-cost --by-model`
- *"Which agents are the most expensive?"* — `/agent-harry-cost --by-agent`
- *"Give me the raw numbers for a spreadsheet"* — `/agent-harry-cost --json`

## Related

- `scripts/log-tokens.py` — produces the `token_usage` events this command reads
- `/agent-harry-audit` — full ledger timeline (events, decisions, files); this command is the cost slice
- `SHARED_CONTEXT.md` § Audit Ledger (v4.1) — schema definition
