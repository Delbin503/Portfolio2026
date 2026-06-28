---
description: Push confirmed Agent Harry artifacts to Notion. Creates a structured tree (Discovery / Define / Metrics / PRDs / Deliver) under your chosen parent page. First run prompts for parent; subsequent runs sync incrementally and idempotently.
argument-hint: "[--re-init to reset .notion-config.json | --dry-run to preview without writing]"
---

# /agent-harry-notion-sync

Publish the confirmed artifacts in `./design-workspace/<project-slug>/` to Notion as a structured workspace. After this runs, your team can read the decision-grade summary in Notion without opening MD files. The MD files stay on disk as the audit trail.

This is a slash command (not a subagent) — it runs in your main Claude Code session, with access to the Notion MCP (`mcp__*__notion-*` tools) which is already connected in your environment.

## Prerequisites

1. Notion MCP must be connected (check the tool list — there should be `mcp__*__notion-search`, `mcp__*__notion-create-pages`, `mcp__*__notion-update-page`, `mcp__*__notion-fetch` available).
2. The project must have at least one confirmed handoff in `./design-workspace/<project-slug>/`. If empty, refuse with a one-liner.
3. The user must have a Notion workspace and a parent page where Agent Harry can publish.

If any prerequisite fails, exit early with a clear message — don't half-sync.

---

## First run — setup (no `.notion-config.json` yet)

1. Detect that `<project-root>/.notion-config.json` doesn't exist.
2. Ask the user: *"Where in Notion should Agent Harry publish? I'll search for a parent page."*
   - Wait for a search query (e.g. "Agent Harry", "Product Designs", or a workspace name).
3. Use `notion-search` to find candidate parent pages matching the query. Limit to top 5.
4. Present the candidates with one line each:
   ```
   1. <page-title> · <breadcrumb> · <last-edited>
   2. ...
   ```
   Ask the user to reply with the number, OR `revise — <new search query>` to search again.
5. Once the user picks, save `<project-root>/.notion-config.json`:
   ```json
   {
     "parent_page_id": "<picked-id>",
     "project_root_page_id": null,
     "synced_pages": {},
     "last_sync": null,
     "version": "v3.5"
   }
   ```
6. Confirm: *"Will publish to **<page-title>**. Run /agent-harry-notion-sync again to actually sync (or run it now — I'll proceed)."*

If `--re-init` argument was passed, delete the existing config and run setup again.

---

## Subsequent runs — sync

1. Read `<project-root>/.notion-config.json`. Bail if missing (run setup first).
2. **Build the project root page** if `project_root_page_id` is null:
   - Title: `<Project Name> — Agent Harry`
   - Parent: `parent_page_id`
   - Content: brief description of the project + a Table of Contents linking to sub-sections (built later)
   - Save the new page ID to `project_root_page_id`.
3. **Glob the design-workspace** for all handoff artifacts:
   - `./design-workspace/<project-slug>/discovery/*.md` → Discovery section
   - `./design-workspace/<project-slug>/define/*.md` → Define section (one sub-page per agent)
   - `./design-workspace/<project-slug>/metrics/*.md` → Metrics section
   - `./design-workspace/<project-slug>/prds/*.md` → PRDs section (one sub-page per PRD file)
   - `./design-workspace/<project-slug>/deliver/*.md` → Deliver section
4. **For each artifact**:
   - If `synced_pages[<file-path>]` exists → update via `notion-update-page` (preserves URL, idempotent)
   - Else → create via `notion-create-pages`, record the returned page ID in `synced_pages`
5. **Page content** — for each artifact, extract:
   - The Executive Summary stat-card → render as a Notion `properties` block / first heading
   - The 3-bullet TL;DR → render as a bulleted list at the top
   - The Decision Data (insights / table / callout / metrics) → render with Notion's matching block types (toggle list, table, callout, divided sections)
   - Skip the long-form body (it's archival; the MD file owns it). Add a footer: *"Full audit trail: `<relative MD path>` in the project repo."*
6. **Update the project root page's Table of Contents** to link to every synced page.
7. **Save** updated `.notion-config.json` with new `last_sync` timestamp.
8. **Report** to the user (in chat) with:
   - Page count created vs updated
   - Direct URL to the project root page in Notion
   - Any errors encountered (and what was skipped)

## Idempotency rules

- Re-running the sync should NEVER duplicate pages. If `synced_pages[<path>]` has a page ID, update it; don't create a new one.
- If a page ID in `synced_pages` is stale (page was deleted in Notion), detect the 404, remove it from config, and re-create.
- If the user deletes a project's `.notion-config.json`, treat as first-run setup.

## Notion structure (the tree you build)

```
<Parent Page (user picked)>/
└── <Project Name> — Agent Harry      ← project_root_page_id
    ├── 📍 Overview                    ← TOC, auto-built each sync
    ├── 🔍 Discovery
    │   ├── Research insights (discovery-researcher)
    │   └── Competitive teardown (competitive-analyst, if it ran)
    ├── 🎯 Define
    │   ├── Positioning (product-positioner)
    │   ├── Prioritization scoring (feature-prioritizer)
    │   ├── Concepts (ideation-facilitator)
    │   └── Strategy / The Bet (pm-strategist)
    ├── 📊 Success Metrics (pm-metrics-architect) ← carries "✓ Confirmed" badge if Gate cleared
    ├── 📄 PRDs
    │   ├── <Feature 1 PRD>
    │   ├── <Feature 2 PRD>
    │   └── ...
    └── 🚀 Deliver
        ├── Design spec (handoff-engineer)
        ├── Usability test plan (usability-tester, if it ran)
        └── Launch plan (pm-launch-architect, if it ran)
```

Use Notion emoji as the icon for each section page (the emoji shown above).

## Dry-run mode (`--dry-run`)

If `--dry-run` argument was passed:

1. Do everything **except** actual Notion writes.
2. Print a report showing what *would* be created or updated:
   ```
   Would create: <Page Title> under <Parent>
   Would update: <Page Title> (notion id: <id>)
   ```
3. Do not modify `.notion-config.json`.

Useful for verifying the plan before pushing real content.

## Error handling

- Notion MCP missing: *"Notion MCP isn't connected. Configure it in Claude Code settings before running this command."* Stop.
- Auth failed: surface Notion's error message + ask user to re-auth in their MCP settings. Don't retry blindly.
- Rate-limited: back off, retry with exponential delay (max 3 retries). If still failing, report what synced and what didn't.
- Partial failure: write `synced_pages` updates for what succeeded, report failures in the chat output. Don't leave the config in a broken state.

## Token-budget rule

A typical sync (after the first run) is cheap: ~$0.05–0.10. The first run with setup is similar. The work is mostly file reads + Notion API calls, not LLM token consumption.

## Output to chat

Be terse. The user just wants to know it worked:

```
Synced to Notion: <project-name>

Created: 6 pages
Updated: 12 pages
Skipped: 0 (no failures)

Open: <direct-url-to-project-root>
```

The next Stop Gate's next-move-suggestion in chat can mention "PRDs are now visible in Notion at <url>" so the user sees the link inline.

## When to invoke this command

- Right after the Success-Metrics Gate is confirmed and you want the team to see what's been decided
- Right after `prd-author` produces PRDs and you want to share them
- Any time after a substantive Stop Gate, to keep Notion fresh
- After the pipeline completes (orchestrator returned `complete`), as a final publish step

Re-running often is fine — idempotency keeps it safe.
