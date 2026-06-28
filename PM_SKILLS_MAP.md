# PM_SKILLS_MAP.md

Agent Harry agents are skill-aware. When the user has Claude Code's PM skill packs installed (`pm-execution`, `pm-market-research`, `pm-marketing-growth`, `pm-product-strategy`, `pm-go-to-market`, `pm-product-discovery`, `pm-toolkit`, `product-management`, `product-tracking-skills`), agents invoke specific skills via the Skill tool rather than re-deriving PM artifacts from scratch.

This file is the source of truth. Agents load it only when they need to confirm their skill ownership — not on every run.

## Per-Agent Skill Ownership

| Agent | Owns PM skills |
|---|---|
| `discovery-researcher` | pm-market-research:analyze-feedback, pm-market-research:research-users, pm-market-research:user-segmentation, pm-product-discovery:interview, pm-product-discovery:summarize-interview |
| `competitive-analyst` | pm-market-research:competitive-analysis, pm-go-to-market:competitive-battlecard, product-management:competitive-brief |
| `product-positioner` | pm-product-strategy:value-proposition, pm-marketing-growth:value-prop-statements, pm-marketing-growth:positioning-ideas, pm-marketing-growth:product-name |
| `feature-prioritizer` | pm-product-discovery:prioritize-features, pm-execution:prioritization-frameworks, pm-product-discovery:analyze-feature-requests, pm-product-discovery:triage-requests |
| `ideation-facilitator` | pm-product-discovery:brainstorm, pm-product-discovery:brainstorm-ideas-new, pm-product-discovery:brainstorm-ideas-existing, pm-product-discovery:opportunity-solution-tree |
| `usability-tester` | pm-execution:test-scenarios, pm-product-discovery:identify-assumptions-existing, pm-product-discovery:prioritize-assumptions |
| `handoff-engineer` | pm-execution:user-stories, pm-execution:job-stories, pm-execution:wwas, pm-execution:create-prd, product-management:write-spec |
| `pm-strategist` *(v3)* | pm-product-strategy:strategy, pm-product-strategy:product-vision, pm-product-strategy:business-model, pm-product-strategy:lean-canvas, pm-product-strategy:startup-canvas, pm-product-strategy:swot-analysis, pm-product-strategy:porters-five-forces, pm-product-strategy:pestle-analysis, pm-product-strategy:ansoff-matrix, pm-product-strategy:pricing-strategy, pm-product-strategy:monetization-strategy, pm-marketing-growth:north-star-metric, pm-marketing-growth:marketing-ideas, pm-market-research:market-sizing |
| `pm-launch-architect` *(v3)* | pm-go-to-market:gtm-strategy, pm-go-to-market:beachhead-segment, pm-go-to-market:ideal-customer-profile, pm-go-to-market:gtm-motions, pm-go-to-market:growth-loops, pm-execution:pre-mortem, pm-execution:release-notes, pm-execution:stakeholder-map, product-management:stakeholder-update |
| `pm-metrics-architect` *(v3)* | pm-product-discovery:metrics-dashboard, pm-execution:plan-okrs, pm-execution:brainstorm-okrs, pm-marketing-growth:north-star, product-tracking-skills:product-tracking-design-tracking-plan, product-tracking-skills:product-tracking-instrument-new-feature, product-tracking-skills:product-tracking-model-product, product-management:metrics-review |
| `prd-author` *(v3.5)* | pm-execution:create-prd, pm-execution:write-prd, pm-execution:user-stories, pm-execution:job-stories, pm-execution:wwas, pm-execution:test-scenarios |
| `orchestrator` | product-management:product-brainstorming, pm-execution:sprint-plan, pm-execution:retro, pm-execution:summarize-meeting, pm-execution:meeting-notes, product-management:roadmap-update, pm-execution:outcome-roadmap |
| `critique-partner` | pm-execution:pre-mortem, grill-me (when user explicitly invokes) |

## How Agents Use This Map

1. Check if the skill is available in this session (system reminder lists installed skills).
2. If yes — invoke the skill via the Skill tool instead of producing the artifact long-form.
3. If no — produce the artifact in the agent's own voice using the body sections.
4. Either way, the Executive Summary + Stop Gate still fire.

The skill's output is treated as the agent's draft. The agent may refine, critique, or merge skill output with its own analysis before producing the final handoff.

Anti-pattern: invoking a PM skill without telling the user. Always name the skill you invoked in the Executive Summary's `inputs_used` field.
