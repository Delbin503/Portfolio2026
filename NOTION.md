# Notion CMS

Edit your portfolio content in Notion, then sync it into the site. Five
databases back the site:

| Notion database | Powers on the site | Type |
| --- | --- | --- |
| **Projects** | Selected work cards + `/work/[slug]` hero | case studies |
| **Work** | Section 05 → *Work* tab | experience |
| **Volunteering** | Section 05 → *Volunteering* tab | experience |
| **Contributions** | Section 06 → *Beyond the day job* | contributions |
| **Testimonials** | Section 07 → *What collaborators say* | praise |
| **Project Media** | Image/video slots on each `/work/[slug]` page | media |

Content lives in `content/data.json`; the sync script rewrites it from Notion.
The site reads that JSON at build time, so it stays fully static and fast.

---

## One-time setup

### 1. Create an integration
Go to <https://www.notion.so/my-integrations> → **New integration** (internal).
Copy the **Internal Integration Secret**.

### 2. Configure env
```bash
cp .env.local.example .env.local
```
Paste the secret into `NOTION_TOKEN`.

### 3. Pick a parent page (bootstrap only)
Create (or choose) a Notion page to hold the databases. Open it → **•••** →
**Connections** → add your integration. Copy the 32-char page ID from the URL
(`notion.so/Title-<THIS>`) into `NOTION_PARENT_PAGE_ID`.

### 4. Create + seed the databases
```bash
npm run notion:bootstrap
```
This creates all 5 databases inside your page, seeded with the content already
in `content/data.json`. It prints the database IDs — paste them into the
`NOTION_DB_*` lines of `.env.local`.

> Already have your own databases? Skip bootstrap. Just match the property
> names in `scripts/notion-lib.mjs` (`SCHEMAS`) and fill in the `NOTION_DB_*`
> IDs. Each database must be shared with the integration (••• → Connections).

---

## Daily use

1. Edit content in Notion.
2. Pull it into the site:
   ```bash
   npm run notion:sync
   ```
3. `npm run dev` to preview, or commit the updated `content/data.json` and deploy.

Only rows with **Published ✓** are synced, ordered by the **Order** number.
Databases whose `NOTION_DB_*` var is unset are skipped (local content is kept),
so you can adopt this one database at a time.

---

## How fields map

**Projects** — pick one **Accent** hex; the site derives the button color,
card gradient, border, badge and mock stripe from it automatically. `Year` +
`Category` build the kicker (e.g. `→ Retail · 2025`); `Order` sets the `⌘1–6`
shortcut. The deep case-study body (the long `/work/[slug]` sections) is *not*
in Notion — it stays in `content/data.json` under each project's `detail` and
is preserved across syncs (matched by `Slug`). Projects without a `detail`
render a generated section set.

**Work / Volunteering** — `Highlights` is one bullet per line.

**Contributions** — `Image` is a **Files & media** property: drag a photo
into it and `npm run notion:sync` downloads it into `public/contributions/`
(Notion's own file URLs expire, so we localize them). With no image, the card
falls back to a tinted tile showing `Org`. `Tone`
(pink/amber/blue/violet/green/plain) sets that tile's color. The card shows the
photo + title + date, and reveals `Description` on hover.

**Testimonials** — `Accent` hex drives the avatar gradient.

**Case-study detail pages** (the rich `/work/[slug]` content) are NOT edited in
Notion — they live in `content/data.json` under each project's `detail` and are
preserved across syncs. Notion's Projects DB controls the card summary (title,
category, blurb, metrics, accent); the deep page content is authored in code.

**Project Media** — this is how you add photos/videos to a case study without
touching code. It has one row per image/video slot on a project's page:
- Each row is linked to a project (`Project` relation) and ordered by `Order`
  (row 1 fills the first slot on the page, row 2 the second, and so on).
- For an image slot: drag a file into the **`Image`** column. For a video slot:
  paste a Vimeo/YouTube link into **`Video URL`** (and set `Kind` = video).
- `Caption` (optional) shows under the media.
- Run `npm run notion:sync` — uploaded images are downloaded into
  `public/casestudies/` and wired into the page; empty rows stay as the grey
  placeholder. The rows were pre-seeded with the slot labels (e.g.
  "jar-aye · User flow") so you know which asset goes where.
- One-time creation: `npm run notion:bootstrap-media` (already run) → add the
  printed `NOTION_DB_PROJECT_MEDIA` id to `.env.local`.

---

## Notes
- `.env.local` is gitignored — never commit your token.
- The Notion free plan is fine for this.
- To deploy with fresh content, run `npm run notion:sync` in CI before
  `npm run build` (set the env vars as CI secrets).
