---
description: Create, refresh, or extend the project's `product-fingerprint.md` — the project-level visual + composition vocabulary that lo-fi-designer, figma-designer, and design-engineer read at intake. Invokes the product-fingerprint-curator agent. Use `--refresh` to re-curate from Figma references. Use `--promote <pattern>` (v5.1) to add a cross-feature pattern that emerged through feature work.
argument-hint: "[--refresh | --promote <pattern> [--used-in <slug,slug,...>]]"
---

# /agent-harry-fingerprint

Curate, refresh, or extend the project's **product fingerprint** — a project-level artifact at `<project-root>/product-fingerprint.md` that captures the existing product's visual language and composition patterns from 3–7 designer-picked "exciting" Figma frames, plus any patterns promoted from cross-feature work.

The fingerprint is read by `lo-fi-designer`, `figma-designer`, and `design-engineer` at intake so new feature work matches the product's actual norms — not just DS tokens, not generic best practices.

## What this command does

1. Detect whether `<project-root>/product-fingerprint.md` already exists.
2. Pick the right mode for the curator:
   - **Mode A (first curation)** — no fingerprint exists, or invoked without flags
   - **Mode B (refresh)** — fingerprint exists AND `--refresh` flag is present
   - **Mode P (promote, v5.1)** — fingerprint exists AND `--promote <pattern>` flag is present
3. Invoke the `product-fingerprint-curator` agent with the appropriate mode.
4. The curator handles intake (Modes A/B), pulls Figma frames as needed, synthesizes or extends the fingerprint, writes the file, and presents a Stop Gate for user approval.

## Argument parsing

| Invocation | Mode |
|---|---|
| `/agent-harry-fingerprint` | Mode A (first curation) — refuses if fingerprint already exists, suggests `--refresh` or `--promote` |
| `/agent-harry-fingerprint --refresh` | Mode B (refresh) — refuses if no fingerprint exists |
| `/agent-harry-fingerprint --promote <pattern>` | Mode P (promote, v5.1) — refuses if no fingerprint exists; otherwise appends the pattern to the `## Promoted Patterns` section after curator confirms evidence |
| `/agent-harry-fingerprint --promote <pattern> --used-in <slug,slug,...>` | Mode P with non-interactive evidence — curator skips the "which features used this?" intake question |

Flags are mutually exclusive: `--refresh` and `--promote` cannot be combined. Refuse with: *"`--refresh` and `--promote` are different operations — pick one. Use `--refresh` to re-curate from Figma references; use `--promote` to add a cross-feature pattern that emerged through feature work."*

## Steps to execute

1. Parse `$ARGUMENTS` for `--refresh`, `--promote <pattern>`, and optional `--used-in <comma-list>`.
2. Check existence of `<project-root>/product-fingerprint.md` via Glob.
3. Apply the routing matrix:
   - **No fingerprint + no flags** → invoke `product-fingerprint-curator` in Mode A
   - **No fingerprint + `--refresh`** → refuse with: *"No existing fingerprint to refresh. Drop the `--refresh` flag to do a first curation, or check if you meant a different project."*
   - **No fingerprint + `--promote`** → refuse with: *"No existing fingerprint to promote into. Run `/agent-harry-fingerprint` first to do the initial curation; promotion adds to an existing fingerprint."*
   - **Fingerprint exists + no flags** → refuse with: *"`product-fingerprint.md` already exists. Add `--refresh` to re-curate from Figma references, `--promote <pattern>` to add a cross-feature pattern, or remove the file manually if you want to start clean."* (Note: do NOT auto-delete; the user must explicitly confirm.)
   - **Fingerprint exists + `--refresh`** → invoke `product-fingerprint-curator` in Mode B
   - **Fingerprint exists + `--promote <pattern>`** → invoke `product-fingerprint-curator` in Mode P, passing `pattern_name` and (if provided) `used_in_features` as a comma-separated list
   - **Both `--refresh` and `--promote`** → refuse (see § Argument parsing above)
4. Wait for the curator's Stop Gate output. Relay the user's decision back to the curator (`y` / `revise <delta>` / `cancel`).

## When to invoke this command

- **First feature being designed in this project** — the orchestrator will auto-prompt fingerprint creation at the Define→Deliver boundary; this command is the manual equivalent
- **Pre-intake refusal escalation** — a Deliver agent refused to run because the fingerprint is missing; the user types `run product-fingerprint-curator now` or invokes this command
- **Product visibly evolved** — rebrand, redesign, new hero work shipped, DS major version bump → run with `--refresh`
- **Stale-detection nudge** — a Deliver agent's pre-intake check found stale references (`lastModified` newer than curation timestamp); user opts to refresh before proceeding → run with `--refresh`
- **Sanity check** — designer eyeballs the fingerprint and feels it no longer represents the product → run with `--refresh`
- **Cross-feature pattern emerged (v5.1)** — a UI pattern (drawer, modal layering, toast position, etc.) has been reused across 2+ features and feels like a product norm but isn't in the original curated references → run with `--promote <pattern>`

## Hard rules

- Do NOT overwrite an existing fingerprint without `--refresh` AND user confirmation.
- Do NOT invoke the curator if `mcp__figma` is not available for Mode A or B — let the curator's own Question 1 handle that refusal. **Mode P (promote) does NOT require `mcp__figma`** — promotion is text-only (pattern name + features-used + optional Figma URL evidence stored as a string).
- Do NOT auto-delete the existing fingerprint before refresh; the curator preserves entries the user keeps.
- Do NOT use `--promote` to add **anti-patterns** — those belong in the existing `## Anti-patterns` section, surfaced through Mode B refresh. Promotion is for **positive** cross-feature patterns only.
- This command is cheap (~$0 — just invokes the curator); the cost lands inside the curator's run.

## Cost expectation

- First curation (Mode A): ~$0.50 (3–7 Figma frames pulled + synthesis + Stop Gate)
- Refresh with mostly-unchanged refs (Mode B): ~$0.20
- Refresh with all refs replaced (Mode B): ~$0.50 (effectively a fresh curation)
- Promote a pattern (Mode P, v5.1): ~$0.05 — no Figma calls required; curator validates the feature slugs against the audit ledger and appends one row

## After the curator completes

The user types `y` at the Stop Gate. The fingerprint file is locked in. From the next `lo-fi-designer` / `figma-designer` / `design-engineer` invocation onward, those agents:

1. Run their pre-intake fingerprint check
2. Load the fingerprint into intake context
3. Apply visual language + composition patterns + anti-patterns to their output

No further command is needed. The fingerprint persists at the project root and is read on every future invocation.
