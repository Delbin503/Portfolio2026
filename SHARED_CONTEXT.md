# SHARED_CONTEXT.md

Every agent in this system reads this file as part of its working context. It defines the handoff schema, file conventions, shared vocabulary, and **token budget rules**.

---

## Project Context

Generator-mode install fills this section. Bundled-mode install leaves it as placeholders — fill it manually before the first real run, or the stack-aware agents (`lo-fi-designer`, `design-engineer`) will fall back to repo scan + intake question.

| Field | Value |
|---|---|
| Product type | <mobile app / web SaaS / internal tool / hardware / other> |
| Stack | <e.g. Next.js + Tailwind + shadcn/ui, SwiftUI, Flutter, Vue/Nuxt, Vanilla HTML> |
| Design system | <Figma library URL / Storybook URL / token files path / external system like Material> |
| Notion workspace | <URL or "none"> |
| Figma file | <main project file URL or "none"> |
| DS Figma file (v4.2) | <URL — auto-populated by `figma-component-bootstrapper`; or "none — run bootstrapper to create"> |
| Component library manifest (v4.2) | <`project-component-library.md` if bootstrapper has run; else "none"> |
| Roadmap link (v5.1) | <Notion / Linear / Jira / Productboard URL — or "none"> |

The **Stack** line is read by `lo-fi-designer` and `design-engineer` as the tier-1 source for stack detection (before repo scan, before intake question). Keep it accurate — wrong stack here means wireframes recommend components that don't exist in the codebase.

The **Roadmap link (v5.1)** is an external reference only. Agent Harry does NOT own, write, or sync roadmap content — that lives in your real product tool (Notion, Linear, Jira, Productboard, etc.). At small scale (under ~10 features) this field is typically `"none"`. At larger scale, `critique-partner` may surface "does this feature align with a known outcome?" prompts using the link as context. Set to `"none"` if you don't track a roadmap externally; downstream agents tolerate absence.

---

## Handoff Schema

Each agent produces a **handoff artifact** at the end of its run. Format is the agent's choice (markdown narrative, structured JSON, or both) — but every handoff MUST start with the human-readable Executive Summary block, followed by frontmatter, then long-form detail.

### Layer 0 — Executive Summary (Human-First, Always First)

The first thing the user sees. Designed for a human skim in under 30 seconds. **This block is mandatory** — no exceptions.

```markdown
## Executive Summary

| Metric | Value |
|---|---|
| Agent | <agent-name> |
| Phase | discovery / define / deliver |
| Confidence | high / medium / low |
| Inputs analyzed | <count + 1-line type breakdown> |
| Key outputs | <count of insights / gaps / decisions> |
| Recommendation | <one phrase — "proceed to define", "run new study", "blocked: X"> |

**TL;DR (3 bullets max):**
- <single most important finding/decision — one line>
- <second most important — one line>
- <single open question or blocker — one line>

**Next step:** <one sentence, concrete, names the next agent or user action>
```

After this block, the agent may produce long-form detail for downstream agents. Long-form is for AI handoff — the Executive Summary is for the human.

### Frontmatter (machine-readable)

```yaml
---
agent: <agent-name>
phase: discovery | define | deliver | cross-cutting
project_slug: <kebab-case identifier — see SUBAGENT_AUDIT_PROTOCOL.md Step 1>
feature_slug: <kebab-case identifier, or null if cross-feature work>
session_id: <s_YYYYMMDD_NNNN — see SUBAGENT_AUDIT_PROTOCOL.md Step 1>
started: <ISO 8601 UTC timestamp>
completed: <ISO 8601 UTC timestamp>
inputs_used:
  - <file or context source>
files_written:
  - <relative path of file written/edited during this run>
confidence: high | medium | low
open_questions:
  - <question that blocks next phase>
recommended_next_agent: <agent-name or "user-decision">
tokens_estimated: <rough number — see Token Budget section below>
---
```

**v3.8 schema changes:**
- `project:` renamed to `project_slug:` — value was already a kebab-case identifier; rename clarifies intent
- `feature_slug:` added — kebab-case per-feature identifier; required for define + deliver phase agents
- `session_id:` added — links this artifact to its audit-ledger entries
- `files_written:` added — what this run produced; populates audit ledger `files_written` field
- Subagents derive these per `SUBAGENT_AUDIT_PROTOCOL.md` Step 1 (a lazy-loaded appendix)

### Long-form Body (for AI handoff, not for human review)

Free-form, follows this skeleton when applicable:

1. **Key findings / decisions** — bulleted, evidence-linked
2. **Tradeoffs surfaced** — what we gave up
3. **Risks & unknowns** — with severity
4. **Recommended next moves** — concrete, not abstract

---

## Token Budget Rules (Critical — Read Before Every Run)

Each Agent Harry pipeline run can cost real money. Default behavior must be **lean**, not exhaustive. The user pays for every token.

### Output Caps (Hard Limits)

| Section | Max length |
|---|---|
| Executive Summary | 1 stat-card table + 3 TL;DR bullets + 1 next-step line — **never longer** |
| Layer 1 / Synthesis (insights) | **Max 6 insights** per run, each one ≤ 5 lines |
| Layer 2 / Gaps | **Max 4 gaps**, each ≤ 3 lines |
| Layer 3 / Critique | **Max 4 concerns**, each ≤ 3 lines |
| Decision table / prioritization | **Max 10 rows** in any scoring table |
| Open questions | **Max 5** — pick the ones that actually block next step |

If the work warrants more, surface that as a follow-up run, not as bloat in the current one.

### Model Routing

| Agent | Model | Why |
|---|---|---|
| `orchestrator` | opus | Plans pipeline, weighs tradeoffs across phases |
| `critique-partner` | opus | Adversarial reasoning is the highest-leverage Opus use |
| Everything else (8 agents) | sonnet | Cheaper, fast enough, plenty smart for phase work |

If an individual agent run obviously needs Opus-grade reasoning (rare), the orchestrator may override per-call — but log the reason in the handoff.

### Synthesis Across Agents

When the orchestrator synthesizes multiple agent outputs, it reads **only the Executive Summary section** of each prior handoff by default, not the long-form body. Long-form is loaded only when a specific decision requires it.

This is the single biggest token saving in the pipeline.

### Anti-Patterns That Burn Tokens

- Re-running an agent because you forgot what it produced (read its handoff file instead)
- Asking an agent to "be thorough" (it already is — that's the prompt's job)
- Pasting full prior outputs into a new prompt (use file references)
- Running Mode A (new from scratch) when Mode B (audit existing) was available
- Calling Opus for synthesis of already-distilled summaries

---

## Always-On Stop Gate (Per-Step Approval, Mandatory)

**This is the most important rule in this document — read it twice.**

After every sub-agent run, the orchestrator (and any agent invoked directly) MUST:

1. Present the **Executive Summary block** of the just-completed work to the user (stat-card table + 3-bullet TL;DR + next-step line). Nothing more — long-form stays in the handoff file.
2. **Stop**. Do not invoke the next agent.
3. Wait for explicit user input. Four valid responses:
   - `y` / `yes` / `ok` / `proceed` / `ဆက်လုပ်` — proceed to the next planned step
   - `revise <what>` — re-invoke the same agent with the revision delta (e.g. "revise — focus on enterprise users only", "revise — drop the Mobbin patterns, use only competitive teardowns")
   - `cancel` / `stop` / `ရပ်` — halt the pipeline, leave the handoff file as-is
   - `grill me` / `stress test` — invoke the `grill-me` skill on the current step's output before deciding; resume the gate after grilling

**This gate fires even when bypass-permissions mode is on.** Permission mode controls *tool authorization*, not *user-in-the-loop checkpoints*. The Stop Gate is a product-design discipline, not a sandbox restriction. Bypassing it is not a feature — it's a regression.

If the user has been silent for the whole session (no message in the current chat turn), do not assume `y`. Re-present the TL;DR and ask explicitly.

### When to suggest `grill me`

Offer `grill me` proactively in the next-step line when:

- The output is the *foundation* for several downstream agents (e.g. discovery synthesis, positioning statement, prioritization decision)
- Confidence is `low` or `medium` on any key claim
- The output makes a non-obvious tradeoff that should be stress-tested before locking in
- The user has been moving fast and skipped earlier critique gates

The phrasing in the next-step line: *"Type `y` to proceed, `revise <delta>` to refine, or `grill me` to stress-test before locking in."*

### Revision loop

On `revise <delta>`:

1. Re-invoke the same sub-agent with the revision delta added to its Goal
2. Pass the prior handoff file as input so the agent extends rather than re-does
3. The revised run is itself subject to the Stop Gate — present new TL;DR, wait for `y` again

There is no implicit cap on revision rounds. The user decides when an output is good enough.

### Anti-patterns at the Stop Gate

- Auto-proceeding because "the user clearly wants this done quickly" — they don't, they want it done right
- Concatenating multiple agent outputs in one response without gates between them
- Asking only "approve?" without showing the TL;DR — the user shouldn't have to open the handoff file to decide
- Treating `revise` as `cancel` — revise means iterate on this step, not skip it

### Decision Data in chat (v5.0 — replaces pre-v5.0 dashboard companion)

In addition to the chat TL;DR, at every Stop Gate the orchestrator renders the just-completed sub-agent's `decisionData` as **markdown in the chat reply**, between the Executive Summary stat-card and the TL;DR. This is where the actual decision-critical content surfaces — scoring tables, research insights with evidence, the bet, beachhead + named accounts, measurement plan layers — so the user can make a `y / revise / pivot` decision without opening the MD handoff.

Full shape spec: `DECISION_DATA_SHAPES.md` (same project root). The orchestrator's `## Decision Data Rendering` section in `orchestrator.md` is the canonical implementation reference.

**v5.0 removed:** the pre-v5.0 visual companion (`dashboard.html` static HTML mirror) and Queue Mode (Python server + `.harry-queue.json` click queue + `/agent-harry-loop` polling slash command). Both were never used in practice — chat is the canonical surface. See `RATIONALE.md` § "Why dashboard was removed (v5.0)" and `CHANGELOG.md`.

---

## Research-First Gate (Hard Block)

The Deliver phase agents (`design-engineer`, `figma-designer`, `usability-tester`, `accessibility-auditor`, `handoff-engineer`) AND the late-Define agent `lo-fi-designer` are **blocked from running** unless one of these conditions is met:

1. A Discovery-phase handoff artifact exists in this project (any of: `discovery-researcher`, `competitive-analyst` Mode A or B output)
2. A Define-phase handoff exists (any of: `product-positioner`, `feature-prioritizer`, `ideation-facilitator`)
3. The user has **explicitly** said: "I have research already, skip Discovery" or equivalent opt-out

The orchestrator enforces this gate. If a user requests Deliver work without Discovery/Define artifacts:

> Orchestrator response: "I can't route to Deliver yet — no Discovery or Define artifacts exist in this project. Options: (a) run discovery-researcher in Mode B on any existing PRD/research you have, (b) run discovery-researcher in Mode A to design new research, or (c) explicitly opt out: tell me 'I have audited research already, proceed to Deliver.'"

`/audit-pipeline` runs this check on demand. See `RATIONALE.md` for the why behind the gate.

---

## Success-Metrics Gate (Hard Block — v3.4)

A second hard block, fires at the Define → Deliver boundary.

The Deliver-phase agents (`design-engineer`, `figma-designer`, `usability-tester`, `accessibility-auditor`, `handoff-engineer`, `pm-launch-architect`) are **blocked from running** once Define artifacts exist UNLESS one of these is true:

Note: `lo-fi-designer` is Define-phase and is NOT blocked by this gate — layout exploration can run before metrics are confirmed, and may inform metric selection.

1. A `pm-metrics-architect` handoff artifact exists in `./design-workspace/<project-slug>/` AND its frontmatter carries a **non-empty `confirmed:` timestamp** (v5.2.1 — the durable signal). The orchestrator stamps `confirmed: <ISO 8601 UTC>` into that frontmatter when the user types `y` at the metrics Stop Gate, in the same step it logs `gate_clear`. `prd-author` and Deliver agents gate on this field, not on conversational memory — an existing-but-unconfirmed handoff (`confirmed:` empty) does NOT clear the gate.
2. The user has explicitly opted out with: *"I have metrics already, skip the confirmation"* / *"skip metrics"* / *"Success metrics မလိုဘူး"* / equivalent phrasing.

`prd-author` (Define-phase) is gated by this boundary too — it independently refuses unless the metrics handoff's `confirmed:` is non-empty. It's not in the "Deliver-phase agents" list above because it enforces the gate itself rather than being blocked by orchestrator routing; the effect is the same (no PRDs until metrics are confirmed).

When Define artifacts exist but `pm-metrics-architect` hasn't run yet, the orchestrator's smallest-next-move MUST be `pm-metrics-architect` Mode A — not a Deliver agent. The Stop Gate after that run frames itself as a **confirmation** of success metrics: the TL;DR's open-question bullet becomes *"Confirm these metrics so Deliver can proceed? Type `y` to lock in; `revise — <delta>` to adjust before locking."*

`/audit-pipeline` reports this gate's status alongside the Research-First Gate. See `RATIONALE.md` for the why.

---

## Product Fingerprint (Critical Input — v4.0)

A project-level artifact at `<project-root>/product-fingerprint.md` that captures the existing product's visual language and composition vocabulary from 3–7 designer-picked "exciting" Figma frames. Read by `lo-fi-designer`, `figma-designer`, and `design-engineer` at intake so new feature work matches the product's actual norms — not just DS tokens, not generic best practices.

### Why it exists

DS tokens describe vocabulary but not *how it's composed*. Two products can share the same DS and still feel completely different — one dense and clinical, the other airy and playful. The fingerprint captures that difference. Without it, new features are DS-correct but product-foreign.

### Lifecycle

- **Written once per project** by `product-fingerprint-curator` — the agent owns the file
- **Read by every future Deliver-agent invocation** — `lo-fi-designer`, `figma-designer`, `design-engineer` load the full file at intake (compact-by-design, ~200 lines max)
- **Refreshable on explicit user trigger** via `/agent-harry-fingerprint --refresh` (rebrand, redesign, new hero work, DS major version bump)
- **No auto-staleness detection beyond `lastModified` timestamps** — user-in-the-loop only

### Pre-intake check (mandatory across all three Deliver agents)

Before any other intake question, `lo-fi-designer` / `figma-designer` / `design-engineer` validate the fingerprint:

1. **Existence check** — file exists at `<project-root>/product-fingerprint.md`
2. **Lightweight freshness check** — for each `figma_node` in Curated References, fetch metadata via `mcp__figma`; compare `node.lastModified` vs frozen `figma_node_last_modified_at_curation`; check for archive-prefix names (`old_` / `deprecated_` / `archive_`)
3. **Decide:** Missing → refuse; Stale → refuse; Fresh → load into intake context, proceed

### Refusal model

**Severity is agent-dependent (v5.2.1):** `figma-designer` and `design-engineer` **hard-refuse** on missing/stale fingerprint — their output is visual/code where drift is expensive. `lo-fi-designer` runs a **soft nudge** instead: it surfaces the same options but proceeds by default with `visual_drift_risk: true` (no typed opt-out required), because ASCII layout exploration is the cheapest, earliest step and shouldn't be blocked by a ~$0.50 curation. The nudge still points the user to curate before hi-fi (where the hard refuse kicks in).

For the hard-refuse agents — refuse-with-explicit-opt-out, parallel to Research-First Gate and Success-Metrics Gate:

- `skip fingerprint` — accepts visual-drift risk; logged as `fingerprint_skipped` in audit ledger; Executive Summary flags `visual_drift_risk: true`
- `proceed with stale fingerprint` — accepts outdated-signal risk; logged as `fingerprint_stale_proceeded`; flags `fingerprint_stale: true`
- `cancel` — halts

### What the fingerprint contains

| Section | Content |
|---|---|
| Curated References | 3–7 entries with `name`, `role`, `figma_node`, `figma_node_last_modified_at_curation`, `why_exciting` |
| Visual Language Synthesis | Prose headline + structured signal (density, color_stance, typography_stance, copy_tone, motion_stance, imagery, corner_radius, shadow, spacing_rhythm) with evidence pointers |
| Composition Patterns | Prose headline + table (page scaffolding by role, empty-state, form, data display, primary CTA placement, confirmation/destruction) with evidence pointers |
| Anti-patterns | 3–5 explicit "this product doesn't do X" statements (mandatory — negative signal is half the value) |
| Open / Unknown | Things the curator couldn't extract; coverage gaps |

### Anti-patterns and enforcement

- **lo-fi-designer**: Primary + Alternative layout variants MUST NOT violate any fingerprint anti-pattern. Risky variant MAY violate ONLY when explicitly annotated with `breaks_antipattern` + rationale.
- **figma-designer**: Mode A frames must respect anti-patterns; Mode B audit gains a "Fingerprint divergence" section (max 4 findings, severity-ranked).
- **design-engineer**: Mode A code must respect anti-patterns; Mode B audit gains the same "Fingerprint divergence" section.

### Asymmetric source curation

- **Figma references — user-curated.** "Exciting" is a judgment call; auto-detection picks wrong frames. Designer names which 3–7 frames define the product.
- **Code paths — auto-discovered.** `design-engineer` extracts feature scope keywords from PRD + `feature_slug`, Globs/Greps `app/` / `pages/` / `src/` for matching files, plus universal primitives from `components/ui/*` and root layout. Surfaces discovered paths at intake transparently; user overrides via `revise — study X instead of Y`.

### Entry-point input (per-feature, not project-level)

Separate from the project-level fingerprint, `lo-fi-designer` takes a per-feature **entry-point input** at intake:

- Figma node URL of the screen the user is on just before the new flow starts (user-provided)
- Code path of the entry-point screen (auto-discovered from PRD + feature_slug; user can override)
- Trigger affordance and return target (read from PRD if present)
- `type`: `existing_screen` | `new_top_level`

Primary layout anchors on entry-point first, fingerprint second. When they disagree, entry-point wins for continuity.

### Curator and slash command

- `product-fingerprint-curator` — cross-cutting subagent that runs the curation. Owns the file. Supports Mode A (first curation) and Mode B (refresh).
- `/agent-harry-fingerprint` — slash command for direct invoke. `--refresh` flag for re-curation.

### What's out of scope (v4.0)

- `critique-partner` using fingerprint anti-patterns as critique criteria (deferred to v4.1)
- `usability-tester` / `handoff-engineer` / `prd-author` fingerprint integration (deferred)
- Screenshots / live URLs as alternative reference inputs (Figma URLs only in v4.0)
- Auto-staleness detection beyond `lastModified` timestamps (no visual hashing)
- Auto-refresh on stale detection (user-in-the-loop only)
- Quality-bar gating purpose (current scope is consistency, not quality enforcement)

---

## Information Architecture (Define-phase Structure — v5.2)

A project/release-level artifact at `./design-workspace/<project_slug>/information-architecture.md` that captures the **cross-feature structure** — object model, navigation hierarchy, screen inventory, and a product-wide **action-priority system**. Written by `information-architect`, read by `lo-fi-designer` and `design-engineer` at intake.

### Why it exists

`lo-fi-designer` designs **one feature at a time**; `prd-author` writes **one PRD per sub-feature**. Nobody owns the seams. A product where every screen is individually well-designed can still feel messy and inconsistent when there's no structural pass holding it together. The IA is that pass. It closes two specific failure modes: **messy information architecture** (no coherent navigation/object structure across features) and **inconsistent action priorities** (primary/secondary/tertiary actions varying screen-to-screen).

### Cardinality

- **Written once per product/release** by `information-architect` — a single structural pass across all in-scope features. `feature_slug` is `null`.
- **`lo-fi-designer` runs once per feature** — inheriting the IA structure. A once-per-product concern can't live inside a per-feature agent; that mismatch is why IA is its own agent, not part of lo-fi.

### Placement

Define phase, between `prd-author` and the first `lo-fi-designer` run: `prioritizer → prd-author → information-architect → lo-fi-designer → design-engineer`.

### Pre-intake check (lo-fi-designer)

`lo-fi-designer` validates the IA at its pre-intake (after the fingerprint + PRD checks). Refuse-with-explicit-opt-out:

- Missing IA → refuse; options: run `information-architect`, or `proceed without IA` (legacy per-feature layout, no global structure) → logged `ia_structure_skipped`, sets `ia_status: skipped` / `ia_inferred: true` (true = inferred-in-isolation; the value `design-engineer` / `figma-designer` read to skip action-priority compliance)
- Present → load into intake context; layouts inherit the screen inventory's nav location + the action-priority map

### What the IA contains

| Section | Content |
|---|---|
| Object model | Domain entities + relationships (1:many, many:many, ownership) |
| Navigation structure | Recommended hierarchy + one genuinely-different alternative + rationale; `max_depth` (flagged if > 3) |
| Action-Priority Map | Part A: 3–5 product-wide global invariants (one primary per screen, destructive never primary, consistent placement, same-action-same-priority). Part B: per-object primary/secondary/tertiary table |
| Screen inventory | One row per screen: `screen · feature_slug · nav_location · primary_object · primary_action` |
| Grouping rationale | Why the structure clusters the way it does (the "why" `critique-partner` checks against) |

### Enforcement (downstream)

- **lo-fi-designer**: places actions per the action-priority map; anchors each screen's nav location from the inventory; echoes the per-feature subset (`ia_for_feature`) + `ia_status` / `ia_inferred` into its handoff frontmatter so Deliver agents inherit it without re-loading the whole IA file
- **design-engineer**: assigns button variants (primary/secondary/ghost) per the action-priority map, then runs an action-priority compliance check and records a per-screen `action_priority_compliance` attestation in its handoff
- **figma-designer**: same enforcement as design-engineer on the Figma-led path — button **component** variants come from the map, with the same compliance attestation. The Figma path is NOT exempt; both Deliver surfaces enforce action priority identically
- **critique-partner**: IA lens — checks for orphan screens (not in the sitemap), action-priority-map violations, and grouping that contradicts the rationale

### What's out of scope (v5.2)

- Per-screen layout (that's `lo-fi-designer`) and visuals (that's `figma-designer` / `design-engineer`)
- Auto-detecting IA drift after the fact (user-in-the-loop only; `critique-partner` surfaces it on request)

---

## Brand Concept (Critical Input — v5.2)

A project-level artifact at `<project-root>/brand-concept.md` that **decodes an existing brand's concept** — what it stands for, its worldview, the mental model it wants users to hold, its vocabulary, and on/off-brand tells. Written by `brand-decoder`, read by `product-positioner`, `ideation-facilitator`, `information-architect`, `lo-fi-designer`, and `design-engineer` at intake.

### Why it exists

`product-fingerprint-curator` captures how the product **looks** and explicitly disclaims brand ("brand voice is observed, not legislated"). `product-positioner` **creates** outward positioning (what the product IS vs. competitors). Neither decodes the **meaning** of an existing brand. When that meaning is assumed instead of decoded, design comes back "technically fine but not how we think about our brand." Brand Concept is the inward, interpretive layer that prevents that — distinct from the fingerprint (visual) and positioning (outward, create).

### Lifecycle

- **Written once per project** by `brand-decoder` (interpretation of an existing brand — refuses and routes to `product-positioner` if there's no brand to decode, e.g. greenfield)
- **Read by consuming agents at intake** — full file (~120 lines max)
- **Trusted only after the Validation Stop Gate passes** — the `validated:` timestamp is set only on user confirmation that the decode matches how they (or the client) actually think. An unvalidated decode is a hypothesis, not an input.

### Pre-intake check (consuming agents)

`product-positioner` / `ideation-facilitator` / `information-architect` / `lo-fi-designer` / `design-engineer` check for `brand-concept.md` at intake. Refuse-with-explicit-opt-out (softer for IA — a nudge, since IA can proceed brand-agnostic):

- **Validated** (`validated:` non-empty) → load into intake context (mental model + vocabulary shape copy, grouping, concepts) — fully trusted
- **Provisional** (v5.2.2 — `validated:` empty but `provisional_self_confirmed:` set) → **load it, but flag `brand_provisional: true`** in the Executive Summary. This is a client-brand decode the designer accepted as their best read without in-session client sign-off; work proceeds without silently faking confirmation. Re-runs to `validated:` once the client confirms.
- **Missing OR unvalidated-and-not-provisional** → options: run `brand-decoder`, or `skip brand concept` → logged `brand_concept_skipped`, Executive Summary flags `brand_unaligned: true`
- **Stale** (v5.2.2 — active timestamp > ~9 months old) → load as normal but nudge once: *"brand decode is N months old — re-decode if the brand has evolved."* No auto-refusal (parallel to, but softer than, the fingerprint freshness check; brand has no machine-checkable `lastModified`, so it's age-based and advisory).

### What the brand concept contains

| Section | Content |
|---|---|
| Concept statement | 1–2 lines the brand owner would read and say "yes, that's us" |
| Worldview / values | How the brand sees its users, its category, what it won't compromise |
| Mental model | The model the brand wants users to hold about it |
| Vocabulary | `use` words / `avoid` words |
| On/off-brand tells | Concrete moves that feel right vs. wrong (off-brand is half the value, mirrors fingerprint anti-patterns) |
| Sources | What was decoded, by type |

### What's out of scope (v5.2)

- Inventing a brand from nothing (that's `product-positioner` create-mode — `brand-decoder` refuses)
- Pulling visual signal (that's `product-fingerprint-curator`)
- Writing outward competitive positioning (that's `product-positioner`)

---

## Browser-Driven Audits (v5.9 — Playwright MCP precondition)

Two Deliver-phase capabilities drive a **real browser themselves** to test a running prototype or URL — no external API, no Gemini, no hosted service. Claude's own vision + the Playwright MCP + (for a11y) axe-core is the entire engine. The mechanism is ported from a Gemini+Puppeteer synthetic-usability tool, re-implemented Claude-native.

| Capability | Agent | What it does |
|---|---|---|
| Automated behavioral usability run | `usability-tester` **Mode C** | Acts as a synthetic user pursuing a goal; logs observed behavior; reports success / steps / errors / rage-clicks / lostness / (optional) path-efficiency. No faked satisfaction scores. |
| WCAG 2.2 AA accessibility audit | `accessibility-auditor` | Injects + runs axe-core in-page for measured contrast / alt / label / ARIA / heading-order findings; vision only for axe's blind spots. |

### Precondition + degradation (the honesty contract)

- **Both require a Playwright MCP connected** in the session. The install/refresh does not bundle an MCP — the user (or environment) provides one. The documented shorthand in agent `tools:` frontmatter is `mcp__playwright`. **Namespace caveat:** a connected Playwright MCP may be exposed under a different prefix (e.g. `mcp__plugin_ecc_playwright__browser_*`). The browser tool methods are the same (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_click`, `browser_type`, `browser_evaluate`); before degrading, an agent must check the actual connected namespace, not just the bare `mcp__playwright__*` name.
- **If no Playwright MCP is connected:** neither agent fakes a run. `usability-tester` Mode C says it can't run and offers Mode A/B instead. `accessibility-auditor` falls back to a static markup/CSS review and states explicitly that contrast and runtime behavior are **unverified**. Never report a measured result that wasn't measured.
- **axe-core** loads from CDN (cdnjs/jsDelivr) via `browser_evaluate`; vendored-source fallback if the CDN is blocked. If axe can't load, contrast/ARIA validity is marked **unverified**, not passing.

### Run them SEQUENTIALLY, not concurrently (shared browser)

A single Playwright MCP is **one stateful browser session**. If `usability-tester` Mode C and `accessibility-auditor` both drive it at once, each agent's `browser_navigate` / `browser_click` moves the page out from under the other — corrupting both the behavioral log and the axe run. They also must not both `Bash`-start the dev server (port conflict / double launch). So:

- Run one, then the other, on the shared session (either order — they don't depend on each other's output).
- The agent that needs the dev server **checks whether it's already running before starting it**; the second agent reuses the running server.
- Only run them truly in parallel if **two separate Playwright contexts/MCPs** are available. Absent that, sequential is the rule. (`design-sync`'s Playwright use is screenshot-verification only and is never scheduled concurrently with these two.)

### Reading the prototype handoff (inputs)

When auditing/testing a `design-engineer` build, both agents read `./design-workspace/<project-slug>/prototype-<feature-slug>.md` for `base_url`, `routes` (the 5 state-toggle routes), and the run command — rather than re-deriving them. `design-engineer` emits `base_url` in that handoff for this purpose.

### Shared severity scale

Both agents (and `usability-tester` Modes A/B) map every finding to **Critical / High / Medium / Low**:

- **Nielsen heuristic 1–4** → 4=Critical, 3=High, 2=Medium, 1=Low
- **axe-core impact** → critical→Critical, serious→High, moderate→Medium, minor→Low
- Every accessibility finding additionally tags its **WCAG success criterion** (e.g. `1.4.3 Contrast (Minimum)`).

### Division of labor with handoff-engineer

`handoff-engineer` writes accessibility **intent** (the target: "contrast should meet 2.2 AA"). `accessibility-auditor` **measures** whether the built prototype meets it. They must not contradict — a spec-says-AA / build-fails-AA gap is the auditor's headline finding.

---

## PM Skills Map

Agents are skill-aware. When the user has PM skill packs installed (`pm-execution`, `pm-market-research`, `pm-marketing-growth`, `pm-product-strategy`, `pm-go-to-market`, `pm-product-discovery`, `pm-toolkit`, `product-management`, `product-tracking-skills`), agents invoke specific skills via the Skill tool instead of re-deriving artifacts.

**Per-agent skill ownership lives in `PM_SKILLS_MAP.md`** (same project root). Each agent loads only its own row when it needs to confirm what it owns. Anti-pattern: invoking a PM skill without naming it in the Executive Summary's `inputs_used` field.

---

## File Conventions

- All outputs land under `./design-workspace/<project-slug>/`. Exploration artifacts (Discovery/Define research, positioning, prioritization) may be grouped in a `<phase>/` subfolder (e.g. `define/prioritization.md`). **Per-feature Deliver artifacts and project-level artifacts use the stable, slug-derived paths in the "Per-feature Deliver artifact paths" table below — they sit directly under `<project-slug>/`, NOT under a `<phase>/` segment.** When in doubt, the table is authoritative for any artifact it names.
- File naming (for the non-tabled exploration artifacts): `YYYY-MM-DD_<agent>_<short-topic>.md`
- Figma node IDs, Notion page IDs, and Mobbin URLs are recorded as **clickable links**, never naked IDs
- Screenshots/exports go in `./design-workspace/<project-slug>/assets/`

### Per-feature Deliver artifact paths

The Deliver agents that build off a single lo-fi handoff use these stable, slug-derived paths:

| Agent | Artifact path | Frontmatter keys (in addition to standard) |
|---|---|---|
| `lo-fi-designer` | `./design-workspace/<project-slug>/lo-fi-<feature-slug>.md` | `entry_point` (object), `fingerprint_compliance` (per-variant), `fingerprint_status` (v4.0) |
| `design-engineer` | `./design-workspace/<project-slug>/prototype-<feature-slug>.md` | `polish_bar`, `base_url` (v5.9 — the runnable URL + port for usability/a11y audits), `routes`, `mock_api_path`, `fingerprint_status`, `fingerprint_anchors_applied`, `discovered_code_paths` (v4.0) |
| `figma-designer` | `./design-workspace/<project-slug>/figma-hifi-<feature-slug>.md` | `figma_file_url`, `figma_screens` (per-screen + per-state node IDs + components_used + new_components), `ds_source`, `ds_status`, `fingerprint_status`, `fingerprint_anchors_applied` (v4.0) |
| `design-sync` (v5.8) | `./design-workspace/<project-slug>/mirror-<feature-slug>.md` (mirror mode) or `diff-<feature-slug>.md` (diff mode) | `mode`, `figma_source_url`, `figma_source_node_id`, `target_path`, `bridge_status`, `gap_threshold`, `fidelity_forecast`, `gaps`, `verification`, `verification_verdict`, `visual_diffs`, `reverse_stale` |
| `usability-tester` (Mode C, v5.9) | `./design-workspace/<project-slug>/usability-<feature-slug>.md` | `mode` (A/B/C), `target_url`, `goal`, `personas`, `variants`, `metrics` (success_rate, step_count, error_rate, rage_clicks, lostness, path_efficiency), `playwright_status` |
| `accessibility-auditor` (v5.9) | `./design-workspace/<project-slug>/a11y-audit-<feature-slug>.md` | `mode` (A/B), `target_url`, `routes_covered`, `wcag_target` (`2.2-AA`), `axe_version`, `violations_by_severity`, `automated_vs_manual_split`, `playwright_status`, `axe_status` |
| `handoff-engineer` | `./design-workspace/<project-slug>/spec-<feature-slug>.md` | `design_tokens_path`, `component_specs` |
| `product-fingerprint-curator` (v4.0) | `<project-root>/product-fingerprint.md` (project-level — NOT under `design-workspace/`) | `last_validated` (ISO 8601 UTC), `curator_session`, per-entry `figma_node_last_modified_at_curation` (frozen ISO 8601 UTC). `feature_slug` is `null` in standard handoff frontmatter (cross-feature work) |

Slugs MUST match the upstream `lo-fi-<feature-slug>.md` — read its frontmatter to be sure. The agent that writes the file owns derivation per `SUBAGENT_AUDIT_PROTOCOL.md` Step 1.

## Shared Vocabulary

To prevent buzzword drift, agents use these specific terms:

| Use | Don't use |
|---|---|
| "user problem" | "pain point" |
| "tradeoff" | "challenge" |
| "evidence shows…" | "research suggests…" |
| "we don't know yet" | "needs further exploration" |
| "this fails when…" | "edge case" |
| "I disagree because…" | "alternative perspective" |

## Confidence Calibration

Every claim an agent makes must carry implicit or explicit confidence. Use this scale:

- **High** — Direct evidence (user quote, analytics, A/B result, established pattern with 3+ references)
- **Medium** — Indirect evidence (analogous product, expert heuristic, single source)
- **Low** — Designer intuition or theoretical reasoning only

Low-confidence claims must be flagged as such. Never present low-confidence claims as high-confidence ones.

## Anti-Pattern Self-Check

Before finalizing any output, every agent runs this internal check:

- [ ] Did I include the Executive Summary block at the top?
- [ ] Am I within the output caps (6 insights, 4 gaps, 4 concerns, etc.)?
- [ ] Did I say "it depends" without naming the dependencies?
- [ ] Did I critique without explaining why and what to do next?
- [ ] Did I use a buzzword instead of a specific term?
- [ ] Did I propose a solution before the problem was named with evidence?

If yes to any → rewrite that section.

## Orchestrator Handoff Protocol

When the orchestrator delegates to a sub-agent, it passes:

1. **Goal** — the specific question this agent must answer
2. **Boundary** — what's out of scope for this run
3. **Inputs** — file paths or prior agent outputs to consume
4. **Success criteria** — how we'll know the output is useful
5. **Approval gate** — does this agent's output need user review before next step?
6. **Token budget** — soft cap on output length for this run

Sub-agents return:

1. **Output artifact** (Executive Summary first, then frontmatter, then long-form)
2. **Status**: `complete` | `blocked` | `needs-user-input`
3. **Suggested next step**

## Context Source Hierarchy

When agents need context, they pull in this order:

1. **Current session** — what the user has just said
2. **Product Fingerprint** — `<project-root>/product-fingerprint.md` (read in full by `lo-fi-designer`, `figma-designer`, `design-engineer` at intake; project-level visual + composition vocabulary)
3. **Prior agent handoffs** — files in `./design-workspace/<project-slug>/` (read Executive Summary only by default)
4. **Notion workspace** — research docs, specs
5. **Figma files** — design source of truth
6. **Mobbin** — pattern reference (Deliver phase)
7. **Web search** — last resort for external context

Agents NEVER fabricate context. If something isn't available in the hierarchy above, they say so and ask.

---

## Audit Ledger (v3.8)

Agent Harry writes an append-only audit ledger at `<project-root>/.harry-audit.jsonl`. One JSON object per line, captured at every Stop Gate and significant pipeline event. The ledger is the cross-session audit trail — chat compacts, but the ledger survives.

### File path

```
<project-root>/.harry-audit.jsonl
```

Hidden dotfile. **Gitignored by default** (see `templates/.gitignore`). Contains raw file paths, decision deltas, Figma URLs — treat as private. Don't commit to public repos without redacting first.

### Per-entry schema (11 core fields + event-specific optional)

```json
{
  "ts": "2026-05-22T12:30:00Z",
  "session_id": "s_20260522_0001",
  "project_slug": "my-checkout-app",
  "feature_slug": "checkout",
  "agent": "design-engineer",
  "mode": "A",
  "phase": "deliver",
  "event": "stop_gate",
  "decision": null,
  "cost_delta": 0.45,
  "files_written": ["prototypes/checkout/page.tsx", "prototypes/checkout/mockApi.ts"],
  "handoff_ref": "design-workspace/my-checkout-app/prototype-checkout.md"
}
```

| Field | Type | Notes |
|---|---|---|
| `ts` | ISO 8601 UTC string | Event timestamp |
| `session_id` | string | `s_YYYYMMDD_NNNN`, counter resets daily |
| `project_slug` | string | Kebab-case project identifier — matches `project_slug:` in handoff frontmatter |
| `feature_slug` | string / `null` | Kebab-case per-feature identifier; `null` for cross-feature work |
| `agent` | string | Subagent name, or `"orchestrator"` for routing events |
| `mode` | `"A"` / `"B"` / `null` | Mode A (generate) or Mode B (audit); null for orchestrator events |
| `phase` | string | `discovery` / `define` / `deliver` / `cross-cutting` / `meta` |
| `event` | string | See event types below |
| `decision` | string / `null` | `y` / `revise` / `pivot` / `cancel` / `null` (for non-decision events like a subagent's own `stop_gate` — the user hasn't decided yet) |
| `cost_delta` | number | This event's estimated USD cost |
| `files_written` | string[] | Relative paths the agent wrote/edited during this run (cap 10) |
| `handoff_ref` | string / `null` | Relative path to the handoff artifact, if any |

**Cumulative cost is NOT a stored field.** It's derived at render time by `/agent-harry-audit` summing `cost_delta` per session. Reasoning: orchestrator and subagents are stateless across invocations; storing a per-entry cumulative would drift. The render command's session-sum is the authoritative cumulative view.

### Event-specific optional fields

| Event type | Extra fields |
|---|---|
| `gate_block` / `gate_clear` | `gate` (`"research_first"` / `"success_metrics"` / `"fingerprint"`), `reason` (one-line string) |
| `pivot` / `revise` | `delta_text` (the text user typed after `pivot —` / `revise —`) |
| `scope_refused` / `iteration_cap_hit` | `cap_hit` (string — which cap fired, e.g. `"design-engineer:1-flow-per-invocation"`) |
| `fingerprint_stale_detected` | `stale_count` (int), `stale_refs` (string[] — names of stale references), `stale_reasons` (`["lastModified-newer"]` / `["archive-prefix-name"]` / mixed) |
| `fingerprint_refreshed` | `entries_kept` (string[]), `entries_replaced` (string[]), `entries_removed` (string[]) |
| `pattern_promoted` (v5.1) | `pattern_name` (string), `used_in_features` (string[] — validated against ledger, min 2), `evidence_figma_url` (string or null), `contradicts_anti_pattern` (string or null — set if user proceeded past Q4 conflict warning) |
| `token_usage` (v4.1) | `tokens_in` (int), `tokens_cache_read` (int), `tokens_cache_write` (int), `tokens_out` (int), `model` (string), `cost_usd` (number — computed), `linked_to_ts` (string — the `ts` of the `stop_gate` event this measures, or `null` for orchestrator-only runs), `source` (string — `"transcript"` or `"estimate"`) |
| `bootstrap_created` (v4.2) | `figma_file_url` (string), `component_count` (int), `feature_specific_added` (string[] — names of feature-specific components beyond the baseline), `tokens_source` (string — path or `null`), `fingerprint_status` (`"fresh"` / `"stale_proceeded"` / `"defaulted"`) |
| `bootstrap_extended` (v4.2) | `components_added` (string[]), `component_count_after` (int), `source_scanned` (string — lo-fi handoff path or `"explicit-list"`) |
| `bootstrap_recreated` (v4.2) | `previous_file_url` (string), `archived_manifest_path` (string), `component_count` (int) |
| `bootstrap_skipped` (v4.2) | `reason` (string — usually `"user-opted-out"`); written by `figma-designer` when user types `proceed without library` |
| `bootstrap_with_defaults` (v4.2) | `reason` (string — usually `"fingerprint-missing"`) |
| `journey_structure_inferred` (v4.3) | `prd_path` (string), `prd_schema_version` (string — usually `null` or pre-v4.3) |
| `journey_structure_skipped` (v4.3) | `prd_present` (bool), `reason` (string — usually `"user-opted-out"`) |
| `ia_created` (v5.2) | `features_in` (string[] — in-scope feature slugs), `nav_structure_chosen` (string — e.g. `"object-centric"`), `max_depth` (int), `screen_count` (int), `global_invariant_count` (int) |
| `ia_structure_skipped` (v5.2) | `reason` (string — usually `"user-opted-out"`); written by `lo-fi-designer` when user types `proceed without IA` |
| `prds_skipped` (v5.2) | `reason` (string — usually `"user-opted-out"`); written by `information-architect` when user types `proceed without prds` |
| `brand_decoded` (v5.2) | `owner` (`"self"` / `"client"`), `sources_count` (int), `validated` (bool — true only after Validation Stop Gate passes) |
| `brand_concept_skipped` (v5.2) | `reason` (string — usually `"user-opted-out"`); written by the consuming agent (`product-positioner` / `ideation-facilitator` / `information-architect` / `lo-fi-designer` / `design-engineer`) when user types `skip brand concept` |
| `bridge_built` (v5.8) | `binding_count` (int), `unbound_count` (int — Figma components left without a code binding, which gap on mirror), `scan_roots` (string[] — code component dirs scanned); written by `design-sync` when it builds/extends the `## Code Bindings` bridge |
| `mirror_run` (v5.8) | `mappable_pct` (int), `component_gaps` (int), `token_gaps` (int), `nonautolayout_gaps` (int), `verification` (`"screenshot"` / `"structural-only"`), `verification_verdict` (`"verified_1to1"` / `"diffs_found"` / `"not_confirmed"`); written by `design-sync` mirror mode |
| `diff_run` (v5.8) | `forward_gaps` (int — Figma nodes absent/changed in code), `reverse_stale_count` (int — code spots drifted from Figma); written by `design-sync` diff mode |
| `a11y_audit_run` (v5.9) | `routes_covered` (string[]), `violations_by_severity` (`{critical,high,medium,low}` int counts), `wcag_target` (string — e.g. `"2.2-AA"`), `axe_version` (string), `axe_status` (`"ran"` / `"cdn-blocked-vendored"` / `"unavailable"`), `playwright_status` (`"live"` / `"absent-static-fallback"`); written by `accessibility-auditor` |
| `modec_run` (v5.9) | `success_rate` (int 0–100), `step_count` (number — avg), `error_rate` (number), `rage_clicks` (number), `lostness` (number), `path_efficiency` (number or `null`), `personas` (int — cohort count), `variants` (int — 1 unless A/B), `playwright_status` (`"live"` / `"absent"`); written by `usability-tester` Mode C |

### Events to log

| Event | When fires |
|---|---|
| `stop_gate` | Every Stop Gate (most common; once per agent completion) |
| `gate_block` | Research-First or Success-Metrics Gate refuses a planned move |
| `gate_clear` | A gate that was blocking transitions to passed (e.g. user runs `pm-metrics-architect` + confirms) |
| `pivot` | User responds `pivot — <new direction>` at any Stop Gate |
| `cancel` | User responds `cancel` / `stop` / `ရပ်` |
| `scope_refused` | Subagent refuses due to scope cap (e.g. `design-engineer` "1 primary flow per invocation") |
| `iteration_cap_hit` | Iteration soft cap reached (e.g. `design-engineer` 3rd revise) |
| `fingerprint_skipped` (v4.0) | User typed `skip fingerprint` at a Deliver-agent pre-intake check |
| `fingerprint_stale_detected` (v4.0) | Pre-intake check found ≥1 stale reference (regardless of user decision) |
| `fingerprint_stale_proceeded` (v4.0) | User typed `proceed with stale fingerprint` at a Deliver-agent pre-intake check |
| `fingerprint_refreshed` (v4.0) | `product-fingerprint-curator` ran in refresh mode and the user confirmed |
| `token_usage` (v4.1) | Real token measurement for an agent run — appended post-hoc by `scripts/log-tokens.sh` from Claude Code transcripts |
| `bootstrap_created` (v4.2) | `figma-component-bootstrapper` ran in Create Mode — project component library written for the first time |
| `bootstrap_extended` (v4.2) | `figma-component-bootstrapper` ran in Extend Mode — components added to existing library |
| `bootstrap_recreated` (v4.2) | `figma-component-bootstrapper` ran in Recreate Mode — old library archived, new one created (user typed `recreate from scratch`) |
| `bootstrap_skipped` (v4.2) | User typed `proceed without library` at the figma-designer Pre-Intake Check #2; hi-fi output falls back to frames+groups |
| `bootstrap_with_defaults` (v4.2) | `figma-component-bootstrapper` ran with `bootstrap with generic Material defaults` because no fingerprint existed |
| `journey_structure_inferred` (v4.3) | A consumer agent (`lo-fi-designer` / `figma-designer` / `design-engineer`) read an old-format PRD (no `schema_version: v4.3`); journey structure was inferred from loose user-stories section rather than derived |
| `journey_structure_skipped` (v4.3) | User typed `proceed without journey spec` at `lo-fi-designer`'s Pre-Intake Check #2; deliverable falls back to legacy single-layout, no persona, no nested-journey awareness |
| `journey_spec_inline` (v4.3) | Reserved for v4.4 — currently unused. Originally for inline yaml journey-spec, dropped per Theme A Q4 |
| `ia_created` (v5.2) | `information-architect` completes a structural pass and the user confirms at the Stop Gate |
| `ia_structure_skipped` (v5.2) | User typed `proceed without IA` at `lo-fi-designer`'s IA pre-intake check; layouts fall back to per-feature with no global structure |
| `prds_skipped` (v5.2) | User typed `proceed without prds` at `information-architect`'s PRD pre-intake check; structure derived from prioritization handoff only (degraded fidelity) |
| `brand_decoded` (v5.2) | `brand-decoder` passed its Validation Stop Gate (decode confirmed as matching how the owner/client thinks) |
| `brand_concept_skipped` (v5.2) | User typed `skip brand concept` at a consuming agent's brand pre-intake check |
| `bridge_built` (v5.8) | `design-sync` built or extended the `## Code Bindings` bridge in `project-component-library.md` (semi-auto scan + user confirm) |
| `mirror_run` (v5.8) | `design-sync` mirror mode completed — an existing Figma frame was mirrored into code, with a fidelity forecast + verification verdict |
| `diff_run` (v5.8) | `design-sync` diff mode completed — a Figma↔code divergence report (forward gaps + reverse stale), no code written without a reconcile gate |
| `a11y_audit_run` (v5.9) | `accessibility-auditor` completed an audit (live axe-core run or static fallback) |
| `modec_run` (v5.9) | `usability-tester` completed a Mode C automated browser-driven behavioral run |

### Who writes the ledger — ownership by event type (v3.8 final)

The writer is determined by the event type, NOT by who's running. This avoids fragile string-match detection of orchestrator-vs-direct invocation.

| Event | Owner | Why |
|---|---|---|
| `stop_gate` | **Subagent** that just ran | Subagent has its own metadata (agent, mode, phase, files_written) — no need for orchestrator to re-extract |
| `scope_refused` | **Subagent** that refused | Only the refusing subagent knows which cap fired |
| `iteration_cap_hit` | **Subagent** | Subagent derives count from ledger (see `SUBAGENT_AUDIT_PROTOCOL.md` Step 3) |
| `gate_block` | **Orchestrator** | Gate routing is orchestrator's responsibility |
| `gate_clear` | **Orchestrator** | Same as above |
| `pivot` | **Orchestrator** | User input at orchestrator level — orchestrator routes the pivot |
| `cancel` | **Orchestrator** | Pipeline halt is orchestrator's responsibility |
| `fingerprint_skipped` (v4.0) | **Subagent** that did the pre-intake check | The check happens inside the agent — agent owns the event |
| `fingerprint_stale_detected` (v4.0) | **Subagent** that did the pre-intake check | Same |
| `fingerprint_stale_proceeded` (v4.0) | **Subagent** that did the pre-intake check | Same |
| `fingerprint_refreshed` (v4.0) | **`product-fingerprint-curator`** | Only the curator runs refresh mode |
| `token_usage` (v4.1) | **`scripts/log-tokens.sh`** (post-hoc) | An agent can't introspect its own token usage mid-run — only the harness knows. The script reads Claude Code transcripts after the fact and appends authoritative measurements. |
| `bootstrap_created` / `bootstrap_extended` / `bootstrap_recreated` / `bootstrap_with_defaults` (v4.2) | **`figma-component-bootstrapper`** | The agent owns mode-specific events for its own work. One mode event fires per run, in addition to the standard `stop_gate`. |
| `bridge_built` / `mirror_run` / `diff_run` (v5.8) | **`design-sync`** | The agent owns its mode-specific events. `bridge_built` fires when it populates/extends the `## Code Bindings` bridge; `mirror_run` or `diff_run` fires once per run alongside the standard `stop_gate`. |
| `a11y_audit_run` (v5.9) | **`accessibility-auditor`** | Fires once per audit run alongside the standard `stop_gate`, whether the live axe run succeeded or it degraded to a static fallback (`axe_status` / `playwright_status` record which). |
| `modec_run` (v5.9) | **`usability-tester`** | Fires once per Mode C run alongside the standard `stop_gate`. Modes A/B fire only `stop_gate`. |
| `bootstrap_skipped` (v4.2) | **`figma-designer`** | Fires when the user opts out of the bootstrapper at figma-designer's Pre-Intake Check #2. Logged before figma-designer proceeds with the frames+groups fallback. |
| `journey_structure_inferred` (v4.3) | **Consumer agent** that read the old PRD (`lo-fi-designer` / `figma-designer` / `design-engineer`) | Informational event; no opt-in required. Fires once per agent run when an old-format PRD is loaded. Multiple events may fire for one feature as it moves through Discovery → Define → Deliver. |
| `journey_structure_skipped` (v4.3) | **`lo-fi-designer`** | Fires when the user types `proceed without journey spec` at lo-fi-designer's Pre-Intake Check #2. Logged before lo-fi-designer proceeds with the legacy single-layout fallback. Downstream agents (figma-designer, design-engineer) will propagate the `journey_source: skipped` flag from the lo-fi handoff and won't re-fire this event. |
| `ia_created` (v5.2) | **`information-architect`** | The agent owns its completion event, in addition to the standard `stop_gate`. Project-level, fires once per IA pass. |
| `ia_structure_skipped` (v5.2) | **`lo-fi-designer`** | Fires when the user types `proceed without IA` at lo-fi-designer's IA pre-intake check. lo-fi sets `ia_status: skipped` / `ia_inferred: true` in its handoff; downstream agents read that and skip action-priority compliance, and won't re-fire. |
| `prds_skipped` (v5.2) | **`information-architect`** | Fires when the user types `proceed without prds` at the IA PRD pre-intake check. |
| `brand_decoded` (v5.2) | **`brand-decoder`** | Fires only on a passed Validation Stop Gate. Project-level, `feature_slug: null`. |
| `brand_concept_skipped` (v5.2) | **Consuming agent** that did the brand pre-intake check (`product-positioner` / `ideation-facilitator` / `information-architect` / `lo-fi-designer` / `design-engineer`) | Whichever agent's pre-intake the user opted out of owns the event, parallel to `fingerprint_skipped`. |

Single writer per event type → **no race condition, no duplicate entries, no detection logic needed**. Direct-invocation works naturally — the subagent self-logs its `stop_gate` whether orchestrator is in the loop or not.

### Cost field semantics (v4.1)

- **`cost_delta`** on a `stop_gate` event = agent's *self-estimated* cost. Approximate, no input/output split, no model.
- **`cost_usd`** on a `token_usage` event = *measured* cost from real transcript tokens × current pricing table. Authoritative when present.
- **Aggregators (`/agent-harry-audit`, `/agent-harry-cost`) prefer `token_usage.cost_usd` over `stop_gate.cost_delta` when both exist for the same agent run**, linked via `linked_to_ts`. Falls back to `cost_delta` when no `token_usage` event has been logged yet (e.g., script hasn't run).

Subagent-side protocol (when + how + what fields) lives in `SUBAGENT_AUDIT_PROTOCOL.md`. Orchestrator-side rules live in `orchestrator.md` § Audit Ledger Write.

### `session_id` generation

Format: `s_YYYYMMDD_NNNN` — e.g. `s_20260522_0001`. Counter resets at midnight UTC. Whoever fires the FIRST event of a session (orchestrator or directly-invoked subagent) generates it. Once established, all downstream entries in that session reuse it. If a session crosses midnight, keep the original session_id.

Subagent derivation rules (read from ledger / inherit from invocation prompt) are in `SUBAGENT_AUDIT_PROTOCOL.md` Step 1.

### Privacy + retention

- **No rotation.** File grows append-only. Real-world projects (5–10 sessions/week) stay under 5MB even after years; render performance fine.
- **Raw paths logged.** No hashing, no redaction. User opts in to commit by removing the gitignore entry.
- **No workspace-wide aggregation.** Per-project only. For multi-project queries, user can shell-merge: `find ~/projects -name ".harry-audit.jsonl" | xargs cat | jq ...`.

### Reading the ledger

`/agent-harry-audit` renders the JSONL as a markdown timeline. Default scope: last 7 days, current project, all events. Flags: `--all`, `--days N`, `--agent X`, `--event Y`, `--session Z`. The command is the only intended user-facing read surface — direct JSONL inspection is supported but not required.

### Anti-patterns

- Logging duplicate entries when both orchestrator and subagent fire at the same Stop Gate
- Writing the ledger from inside the chat Decision Data render (separate concerns — chat is the decision surface; ledger is structured audit)
- Reading the full ledger into context at run-time — only the slash command needs to scan it, not every agent
- Logging full long-form handoff bodies in `files_impacted` — only file paths, max 10 per entry

---

## Decision Data Shapes (v3.3)

Every agent's handoff includes a `decisionData` structured object that the orchestrator renders as markdown in chat (v5.0 — was dashboard HTML pre-v5.0). **Full spec, all 4 shape types, and the per-agent shape map live in `DECISION_DATA_SHAPES.md`** (same project root). Load that file only when you're producing or rendering decisionData.

Length discipline: each agent's decisionData stays within the output caps above (max 6 insights / 4 gaps / 10 scoring rows / etc.). The block is for headline data only; full methodology stays in the MD handoff.

---

## Notion Sync (v3.5)

After confirmed artifacts exist, you can publish them to Notion via the `/agent-harry-notion-sync` slash command. This is opt-in — the pipeline runs the same whether you sync to Notion or not. Use it when teammates need to read decisions outside Claude Code.

### What gets synced

- **Discovery** insights (from `discovery-researcher`) + competitive teardown (from `competitive-analyst`)
- **Define** artifacts — positioning, prioritization scoring, concepts, the strategic bet
- **Success Metrics** (from `pm-metrics-architect`) — carries a `✓ Confirmed` badge if the Success-Metrics Gate cleared
- **PRDs** (from `prd-author`) — one Notion page per PRD file
- **Deliver** artifacts — design spec, usability test plan, launch plan

### What does NOT get synced

- Full long-form bodies of MD handoffs (they're archival; the MD files own them)
- Critique-partner stress-test responses inline — they're folded into the artifact they critiqued, not separate pages

### Config file

`<project-root>/.notion-config.json` (created by first run of the slash command). Schema:

```json
{
  "parent_page_id": "<notion-page-id-user-picked>",
  "project_root_page_id": "<notion-page-id-of-Agent-Harry-project-root>",
  "synced_pages": {
    "<relative-artifact-path>": "<notion-page-id>"
  },
  "last_sync": "<ISO-8601 UTC>",
  "version": "v3.5"
}
```

Idempotent — re-running the slash command updates pages in place, doesn't duplicate.

### When to invoke

- After the Success-Metrics Gate clears, before kicking off design (so teammates can review metrics + prioritization in Notion)
- After `prd-author` produces PRDs (so engineering can read them in Notion)
- After the pipeline marks complete (final publish)
- Any other time you want Notion to reflect the current state — the command is cheap (~$0.05–0.10 per run)

### Anti-patterns

- Auto-syncing on every Stop Gate without user opt-in (wastes Notion API quota; some artifacts shouldn't be public yet)
- Syncing un-confirmed drafts (only artifacts the user has approved with `y` should land in Notion — that's the team's read-once source of truth)
- Duplicating data Notion can compute (use Notion's TOC block for the overview, not a hardcoded page list)
