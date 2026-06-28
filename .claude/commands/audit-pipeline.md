---
description: Audit the Agent Harry pipeline state — checks whether Discovery/Define artifacts exist before Deliver work is allowed. Blocks "jump straight to code/design" shortcuts.
argument-hint: "[optional: project-slug]"
---

# /audit-pipeline

Run this before starting any Deliver-phase work (design-engineer, usability-tester, handoff-engineer, or any code/design implementation) — and before late-Define work (lo-fi-designer). It enforces the **Research-First Gate** defined in `SHARED_CONTEXT.md`.

## What this command does

1. Inspect `./design-workspace/$ARGUMENTS/` (or `./design-workspace/` if no arg given) for Discovery and Define handoff artifacts
2. Report which phases have run, which haven't
3. **Block** any further Deliver-phase action if the gate fails — refuse with a clear explanation
4. Suggest the cheapest path to clear the gate (Mode B audit of existing materials is almost always the right answer)

## Steps to execute

1. Use Glob to find all `.md` files under `./design-workspace/` matching the pattern `*_<agent>_*.md`. Group them by phase using the agent name:
   - **Discovery**: `discovery-researcher`, `competitive-analyst`
   - **Define**: `product-positioner`, `feature-prioritizer`, `ideation-facilitator`, `pm-strategist`, `lo-fi-designer`
   - **Deliver**: `design-engineer`, `usability-tester`, `handoff-engineer`, `pm-launch-architect`, `prd-author`
   - **Meta**: `orchestrator`, `critique-partner`
2. For each artifact found, read **only the Executive Summary block** (don't load long-form bodies — that's the token-budget rule from `SHARED_CONTEXT.md`).
3. Produce the audit report below.

## Report format (mandatory — Executive Summary first)

```markdown
## Executive Summary

| Metric | Value |
|---|---|
| Project | <slug or "(no slug given)"> |
| Discovery artifacts | <count> (<file names or "none">) |
| Define artifacts | <count> |
| Deliver artifacts | <count> |
| Gate status | **PASS** / **BLOCK** / **OPTED-OUT** |
| Recommended next | <agent or action> |

**TL;DR (3 bullets max):**
- <main finding about pipeline state>
- <main risk if user proceeds to Deliver>
- <cheapest unblock action>

**Next step:** <one concrete sentence>

---

## Detail

### Discovery phase
- <artifact 1> — <agent> — <one-line summary from its Exec Summary> — confidence <h/m/l>
- <artifact 2> ...
- (none) if empty

### Define phase
- <same format>

### Deliver phase
- <same format>

### Gate decision

**Status:** PASS / BLOCK / OPTED-OUT

If **BLOCK**, state explicitly:
> Deliver-phase work is blocked. Discovery/Define artifacts are required first.
>
> Cheapest unblock options:
> (a) Run discovery-researcher in Mode B on any existing PRD/research: `Use the discovery-researcher agent in Mode B to audit <file>`
> (b) Run discovery-researcher in Mode A to design new research from scratch
> (c) Explicit opt-out — only valid if you've genuinely audited the research outside this system. Say: "I have audited research already, proceed to Deliver."

If **PASS**, name the specific Deliver agent to invoke next and what its Goal/Boundary/Inputs should be.

If **OPTED-OUT**, log the opt-out reason for the handoff trail.
```

## Hard rules

- Never auto-pass the gate based on "the user seems to know what they're doing" — only the three opt-out phrases count.
- Never load full long-form artifact bodies during this audit — Executive Summary blocks only. The whole point of this command is to be cheap.
- If `./design-workspace/` doesn't exist at all, treat as BLOCK with zero artifacts and recommend (a) or (b).
- If the user runs this command and the gate is already PASS, don't bloat the output — just confirm pass + name the next agent.

## When to invoke this command

- Before any orchestrator plan that includes a Deliver phase
- After install, to confirm the project is set up correctly
- Whenever the user says "let's start designing" / "let's prototype" / "build the MVP" — anything that smells like Deliver
- As a recovery action when work has gone sideways: "let me audit where we actually are"
