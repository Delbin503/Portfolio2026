# DECISION_DATA_SHAPES.md

Every agent's handoff includes a `decisionData` structured object that the orchestrator renders as **markdown in the chat reply** at every Stop Gate (v5.0 — was dashboard HTML pre-v5.0). The shape depends on the agent. Four shape variants are defined here.

This file is loaded by the orchestrator at every Stop Gate render and by agents that need to confirm their own shape. The orchestrator's `## Decision Data Rendering` section in `orchestrator.md` specifies how each shape maps to chat markdown.

## Markup convention in string fields (v5.0)

The `text`, `evidence`, `quote`, `meta`, and table cell `html` fields support a **minimal HTML subset** that the orchestrator translates to chat markdown at render time:

| HTML in the field | Renders in chat as |
|---|---|
| `<strong>X</strong>` | `**X**` |
| `<em>X</em>` | `*X*` |
| `<code>X</code>` | `` `X` `` |
| `<br>` | newline (`\n`) |
| `<a href="URL">X</a>` | `[X](URL)` |

Anything else gets stripped (text content kept, tags dropped). Sub-agents may also emit native markdown directly — it passes through unchanged. The HTML subset is kept as a back-compat shim for pre-v5.0 agent outputs.

Inline status indicators that pre-v5.0 used CSS span classes now render as text decorations:

| Pre-v5.0 (CSS) | v5.0 (markdown/unicode) |
|---|---|
| `<span class="delta-up">↑</span>` | `↑` (kept as unicode) |
| `<span class="delta-down">↓</span>` | `↓` (kept as unicode) |
| `<span class="pill-in">in</span>` | `` `in` `` |
| `<span class="pill-out">out</span>` | `` `out` `` |
| `<span class="pill-open">open</span>` | `` `open` `` |

## Type 1 — `insights` (used by: discovery-researcher, ideation-facilitator, critique-partner)

Numbered list of decision-critical findings with evidence and per-item confidence.

```yaml
decisionData:
  type: insights
  label: "Top 5 insights · with evidence + confidence"
  items:
    - text: "<strong>Cart abandonment peaks at the verify-phone step</strong>"
      evidence: "\"I gave up because the SMS never came\" — 6/12 interviews · GA4 funnel drop 41%"
      conf: high   # high | medium | low
    - text: "..."
      evidence: "..."
      conf: medium
    # Max 5 items per insights panel. Trim aggressively.
```

Chat-rendered output:

```markdown
**Decision Data — Top 5 insights · with evidence + confidence**

1. **Cart abandonment peaks at the verify-phone step**
   _Evidence:_ "I gave up because the SMS never came" — 6/12 interviews · GA4 funnel drop 41% · _Confidence:_ `high`
2. **...**
   _Evidence:_ ... · _Confidence:_ `medium`
```

> **Optional inline widget (v5.3):** when an inline-widget tool (`show_widget`) is available in the session, the orchestrator may render any of the 4 shapes as a card UI via its `widgets/<shape>.widget.html` template instead of markdown (`insights` → `widgets/insights.widget.html`, `table` → `widgets/table.widget.html`, `callout` → `widgets/callout.widget.html`, `metrics` → `widgets/metrics.widget.html`). Markdown stays the default and the only universal fallback. The widget costs *more* output tokens, not fewer — it's a UX upgrade, not a token saving. See `orchestrator.md` § Decision Data Rendering → "Widget render" for the shape→template→island-schema map.

## Type 2 — `table` (used by: feature-prioritizer, competitive-analyst)

Structured comparison/scoring table.

```yaml
decisionData:
  type: table
  label: "Re-scored backlog · top 6 with deltas + MVP call"
  cols:
    - { label: "Feature" }
    - { label: "Reach",  num: true }
    - { label: "Impact", num: true }
    - { label: "Effort", num: true }
    - { label: "RICE",   num: true }
    - { label: "MVP" }
  rows:
    - cells:
        - { html: "<strong>Guest checkout</strong>" }
        - { num: true, html: "9" }
        - { num: true, html: "8" }
        - { num: true, html: "3" }
        - { num: true, html: "76 ↑" }
        - { html: "`in`" }
    - dropped: true
      cells:
        - { html: "~~Wishlist sync~~" }
        - { num: true, html: "0.4 ↓" }
        # ...
```

Chat-rendered output:

```markdown
**Decision Data — Re-scored backlog · top 6 with deltas + MVP call**

| Feature | Reach | Impact | Effort | RICE | MVP |
|---|---:|---:|---:|---:|---|
| **Guest checkout** | 9 | 8 | 3 | 76 ↑ | `in` |
| ~~Wishlist sync~~ | … | … | … | 0.4 ↓ | `out` |
```

Numeric columns use `---:` separators (right-aligned). Max 10 rows per scoring panel.

## Type 3 — `callout` (used by: product-positioner, pm-strategist, pm-launch-architect)

Single highlighted quote with supporting context.

```yaml
decisionData:
  type: callout
  flavor: launch   # optional — "launch" prepends 🎯 to the headline in chat
  label: "The bet · one sentence + falsification + tradeoffs"
  quote: 'We win by being the <em>fastest</em> mobile checkout in Southeast Asia for cash-on-delivery merchants — not by feature breadth.'
  meta: '<strong>Falsifiable:</strong> if 3-tap doesn\'t lift conversion ≥18% by week 6, the bet fails.<br><br><strong>Tradeoffs we accept:</strong> ...'
```

Chat-rendered output:

```markdown
**Decision Data — The bet · one sentence + falsification + tradeoffs**

> 🎯 **We win by being the *fastest* mobile checkout in Southeast Asia for cash-on-delivery merchants — not by feature breadth.**
>
> **Falsifiable:** if 3-tap doesn't lift conversion ≥18% by week 6, the bet fails.
>
> **Tradeoffs we accept:** …
```

For `flavor: launch` (pm-launch-architect's beachhead callout), the headline gets a `🎯 ` prefix. No other flavor markers — keep chat clean.

## Type 4 — `metrics` (used by: pm-metrics-architect)

Stacked rows of measurement-plan layers (north-star / input / health / counter).

```yaml
decisionData:
  type: metrics
  label: "4-layer measurement plan · north-star · input · health · counter"
  layers:
    - layer: "North-star"
      title: "Completed checkouts per active merchant per day"
      small: "ONE number · falsifiable · tracks what users get, not what we ship"
    - layer: "Input × 3"
      title: "New activations / day · Sessions per merchant · Cart conversion %"
      small: "Variables the team can move weekly"
    - layer: "Counter × 1"
      title: "Support tickets per merchant per week"
      small: "Catches winning the wrong way"
```

Chat-rendered output:

```markdown
**Decision Data — 4-layer measurement plan · north-star · input · health · counter**

- **North-star:** Completed checkouts per active merchant per day _(ONE number · falsifiable · tracks what users get, not what we ship)_
- **Input × 3:** New activations / day · Sessions per merchant · Cart conversion % _(Variables the team can move weekly)_
- **Counter × 1:** Support tickets per merchant per week _(Catches winning the wrong way)_
```

Group by layer; the `small` description renders in italics in parentheses. The pre-v5.0 `layerKey` field (for CSS class coloring) is ignored in chat rendering.

## Per-Agent Shape Map

| Agent | decisionData.type | What goes in it |
|---|---|---|
| `discovery-researcher` | insights | Top 5 insights (text + evidence + confidence) |
| `competitive-analyst` | table | Pattern matrix: pattern · apps · convention · risk (max 7 rows) |
| `product-positioner` | callout | The positioning statement; meta has the value-prop options |
| `feature-prioritizer` | table | Scoring table (top 8) with deltas and MVP pills |
| `ideation-facilitator` | insights | 3–5 concept candidates with one-line tradeoff |
| `lo-fi-designer` | insights | 3 layout alternatives (primary/alternative/risky) — text + DS-vs-new component count + confidence (max 3 items) |
| `design-engineer` | table | Screens built: screen · states covered · DS components · new components · polish level (max 6 rows) |
| `usability-tester` | insights | Findings (max 5) with severity in the conf chip. **Mode C (v5.9):** same `insights` findings; the behavioral metrics scoreboard (success / steps / errors / rage-clicks / lostness / path-efficiency) lives in handoff frontmatter + body, not in decisionData — findings are the decision surface, metrics are the evidence behind them |
| `accessibility-auditor` (v5.9) | table | WCAG findings (max 8 rows): finding · severity · WCAG SC · route/state. `table` is used (not `insights`) so severity reads as its own column instead of being overloaded into the confidence chip |
| `design-sync` (v5.8) | table | Mirror/diff scope: component/section · mapped? · gap kind · fidelity (max 8 rows) |
| `handoff-engineer` | table | Spec scope: screens · component states · tokens · open dev questions |
| `pm-strategist` | callout | The bet · falsification · tradeoffs |
| `pm-launch-architect` | callout (flavor: launch) | Beachhead + ICP · meta has named accounts + motion + kill-switch |
| `pm-metrics-architect` | metrics | 4 layers — north-star / input / health / counter |
| `critique-partner` | insights | Concerns (max 5); conf chip carries severity |
| `orchestrator` | (skip) | Orchestrator itself never produces decisionData — it renders what the just-completed sub-agent produced |

**Beyond the 4 shapes (v5.9):** two browser-driving agents have extra widgets documented in `orchestrator.md`, not here — `usability-tester` Mode C adds a supplemental **result** widget (`ut-result.widget.html`, the metrics scoreboard, on top of its `insights` findings), and both Mode C and `accessibility-auditor` have **pre-run elicitation** input widgets (`ut-inputs` / `a11y-inputs`) that collect run config via a form before the run. The a11y **result** uses the `table` shape above (no separate result widget). See `orchestrator.md` § "Supplemental: Mode C result" + § "Elicitation widgets".

## Field-to-Shape Mapping for v3.7 Agents

The v3.7 split agents (`lo-fi-designer`, `design-engineer`) carry richer semantic data than the 4 existing shape types natively model. Rather than introducing a 5th shape type, we map the richer fields into the existing `insights` / `table` shapes' free-form slots.

### `lo-fi-designer` → `insights` shape (max 3 items)

Each insight item represents one of the 3 ASCII layouts (primary / alternative / risky).

Encoding for richer fields:

| Semantic field | Encoded where |
|---|---|
| `chosen_layout` | `text` HTML prefix: `<strong>Primary</strong> — <one-line summary>` |
| `flow_screens` count | `text` suffix: `... · 5 screens` |
| `new_components_count` | `evidence` left half: `Uses 8 DS components, 2 new` |
| `ds_components_used[]` | `evidence` (compact list, max 5 names) |
| `figjam_url` | `evidence` right half: `... · <a href="...">Figjam</a>` |
| `confidence` per layout | `conf` chip (high / medium / low) |

Example item:
```yaml
- text: "<strong>Primary</strong> — sidebar + tabbed main + persistent command bar · 5 screens"
  evidence: "Uses 8 DS (TopBar, Sidebar, Tabs, Card, ...), 2 new (CommandPalette, FlowProgress) · <a href=\"https://figma.com/...\">Figjam</a>"
  conf: high
```

Renders in chat as:

```markdown
1. **Primary** — sidebar + tabbed main + persistent command bar · 5 screens
   _Evidence:_ Uses 8 DS (TopBar, Sidebar, Tabs, Card, ...), 2 new (CommandPalette, FlowProgress) · [Figjam](https://figma.com/...) · _Confidence:_ `high`
```

Long-form data (full ASCII layouts, full component tables, per-layout rationale) lives in the handoff body — the panel surfaces only the headline data.

> **Supplemental wireframe widget (v5.4 / v5.5):** beyond this `insights` shape, `lo-fi-designer` emits a `wireframe` frontmatter block that the orchestrator renders as a **grayscale wireframe** via `widgets/wireframe.widget.html` — the visual companion to the text comparison above. It is *additional to*, not a replacement for, the `insights` decisionData; the body ASCII remains the durable record and the no-widget fallback. The widget has two modes: **(v5.4) layout-choice** — the 3 layout alternatives at region+label fidelity, where the user picks one; and **(v5.5) Section Detail Loop** — after a layout is chosen, the orchestrator loops over its sections one at a time, each gate detailing one section down to its **lo-fi component composition** (`components[]` of labeled boxes `name · type · role`, never styled skeletons). The per-section gate's `insights` lists that section's components. This is the second agent-specific supplemental widget (alongside `information-architect`'s `ia-tree.widget.html`); see `orchestrator.md` § Decision Data Rendering → Widget render → "Supplemental: lo-fi wireframe" and "Section Detail Loop".

> **Flow widget (v5.6):** `lo-fi-designer` additionally emits a `flow` frontmatter block that the orchestrator renders as a **native vertical-spine flow** via `widgets/flow.widget.html` — the Journey Map (persona + intent + spine, expanded) and the Userflow (detailed steps, collapsible), at the layout-choice gate before the wireframe widget. Same companion rule: the body Mermaid/ASCII + Figjam URL stay as the record + fallback. With this, `lo-fi-designer` drives two supplemental widgets of its own (flow + wireframe), and the three agent-specific supplementals total is flow + wireframe + the IA's `ia-tree`; see `orchestrator.md` § Widget render → "Supplemental: lo-fi flow".

### `design-engineer` → `table` shape (max 6 rows = scope-cap aligned)

Each row represents one screen in the built flow.

Encoding for richer fields:

| Semantic field | Encoded where |
|---|---|
| `screens_built[]` | one row per screen |
| `states_covered[]` | "States" column: comma-joined or count (e.g. `5/5` or `empty, loading, populated, error, edge`) |
| `polish_level` (D2 / D3) | column header in `label` or per-row column |
| `stack_detected` | table `label` (top of panel): `Production-visual (D2) · Next.js + Tailwind` |
| `iteration_count` | table `label` suffix: `... · iteration 2 of 3` |
| `prototype_path` | first column's path link, or in `label` |

Example:
```yaml
decisionData:
  type: table
  label: "Production-visual (D2) · Next.js + Tailwind · iteration 2 of 3"
  cols:
    - { label: "Screen" }
    - { label: "States",     num: true }
    - { label: "DS used",    num: true }
    - { label: "New",        num: true }
    - { label: "File" }
  rows:
    - cells:
        - { html: "<strong>checkout/index</strong>" }
        - { num: true, html: "5/5" }
        - { num: true, html: "6" }
        - { num: true, html: "1" }
        - { html: "<code>prototypes/checkout/page.tsx</code>" }
```

Cumulative cost is NOT in the Decision Data block — it's surfaced separately via `/agent-harry-cost` and `/agent-harry-audit` session totals.

## Length Discipline

Each agent's decisionData stays within the output caps in `SHARED_CONTEXT.md` Token Budget Rules (max 6 insights / 4 gaps / 10 scoring rows / etc.). The Decision Data block is for the *headline* data the user needs to decide; full methodology, sample bias audit, dropped ideas, etc. still live in the MD handoff file. The block's job is to make the `y / revise / pivot` choice possible without opening MD; the MD is the audit trail.
