// Pulls content from the 5 Notion databases and rewrites content/data.json.
//
//   node --env-file=.env.local scripts/notion-sync.mjs
//
// Only `Published` rows are synced, ordered by the `Order` number. Databases
// whose env var is unset are skipped (their local content is kept), so a
// partial setup still works. Local-only fields (heroStats, moreProjects,
// writing) and each project's authored `detail` are preserved.
import fs from "node:fs";
import path from "node:path";
import {
  notionClient,
  readData,
  writeData,
  read,
  queryAll,
  themeFromAccent,
  testimonialGradient,
  SCHEMAS,
  ROOT,
} from "./notion-lib.mjs";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";

/**
 * Notion-hosted file URLs expire (~1h), so download each into /public at sync
 * time and rewrite `image` to a stable local path the static build can serve.
 */
async function localizeImages(items, subdir) {
  const withImg = items.filter((it) => it._imageUrl);
  if (!withImg.length) {
    items.forEach((it) => delete it._imageUrl);
    return;
  }
  const dir = path.join(ROOT, "public", subdir);
  fs.mkdirSync(dir, { recursive: true });
  for (const it of items) {
    const url = it._imageUrl;
    delete it._imageUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ext =
        (new URL(url).pathname.match(/\.(png|jpe?g|webp|gif|avif|svg)$/i)?.[1] ??
          (res.headers.get("content-type")?.split("/")[1] || "png")
        ).toLowerCase().replace("jpeg", "jpg");
      const file = `${slugify(it.title)}.${ext}`;
      fs.writeFileSync(
        path.join(dir, file),
        Buffer.from(await res.arrayBuffer())
      );
      it.image = `/${subdir}/${file}`;
    } catch {
      /* leave image undefined on failure */
    }
  }
}

const byOrder = (a, b) => (a._order ?? 1e9) - (b._order ?? 1e9);
const titleCase = (s) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .filter(Boolean)
    .join(" ");

async function fetchRows(notion, envKey) {
  const dbId = process.env[envKey];
  if (!dbId) return null; // not configured → skip, keep local content
  const rows = await queryAll(notion, dbId);
  return rows.map((r) => ({ p: r.properties, _order: read.number(r.properties.Order) }));
}

function mapProjects(rows, prevBySlug) {
  return rows
    .filter((r) => read.checkbox(r.p.Published))
    .sort(byOrder)
    .map((r, i) => {
      const accent = read.text(r.p.Accent) || "#a78bfa";
      const category = read.select(r.p.Category);
      const year = read.text(r.p.Year);
      const slug = read.text(r.p.Slug);
      const theme = themeFromAccent(accent);
      const prev = prevBySlug.get(slug);
      const cs = {
        slug,
        cmdKey: `⌘${i + 1}`,
        code: read.text(r.p.Code),
        category,
        kicker: `→ ${titleCase(category)}${year ? ` · ${year}` : ""}`,
        paletteLabel: read.text(r.p["Palette label"]) || read.text(r.p.Blurb),
        title: read.title(r.p.Name),
        metrics: read.text(r.p.Metrics),
        blurb: read.text(r.p.Blurb),
        mockLabel: read.text(r.p["Mock label"]) || "[ preview ]",
        ...theme,
      };
      if (prev?.detail) cs.detail = prev.detail; // case-study detail lives in code
      return cs;
    });
}

function mapExperience(rows) {
  return rows
    .filter((r) => read.checkbox(r.p.Published))
    .sort(byOrder)
    .map((r) => ({
      period: read.text(r.p.Period),
      company: read.title(r.p.Company),
      location: read.text(r.p.Location),
      role: read.text(r.p.Role),
      tags: read.multi(r.p.Tags),
      bullets: read.lines(r.p.Highlights),
    }));
}

function mapContributions(rows) {
  return rows
    .filter((r) => read.checkbox(r.p.Published))
    .sort(byOrder)
    .map((r) => ({
      title: read.title(r.p.Title),
      org: read.text(r.p.Org),
      date: read.text(r.p.Date),
      tone: read.select(r.p.Tone) || "plain",
      description: read.text(r.p.Description),
      certificateUrl: read.url(r.p["Certificate URL"]) || undefined,
      _imageUrl: read.files(r.p.Image)[0],
    }));
}

function mapTestimonials(rows) {
  return rows
    .filter((r) => read.checkbox(r.p.Published))
    .sort(byOrder)
    .map((r) => {
      const accent = read.text(r.p.Accent) || "#a78bfa";
      return {
        quote: read.text(r.p.Quote),
        name: read.title(r.p.Name),
        title: read.text(r.p.Title),
        gradient: testimonialGradient(accent),
      };
    });
}

async function main() {
  const notion = notionClient();
  const data = readData();
  const prevBySlug = new Map((data.caseStudies ?? []).map((c) => [c.slug, c]));

  const [projects, work, volunteering, contributions, testimonials] =
    await Promise.all([
      fetchRows(notion, SCHEMAS.projects.envKey),
      fetchRows(notion, SCHEMAS.work.envKey),
      fetchRows(notion, SCHEMAS.volunteering.envKey),
      fetchRows(notion, SCHEMAS.contributions.envKey),
      fetchRows(notion, SCHEMAS.testimonials.envKey),
    ]);

  const summary = [];
  if (projects) {
    data.caseStudies = mapProjects(projects, prevBySlug);
    summary.push(`projects: ${data.caseStudies.length}`);
  }
  if (work) {
    data.experience = mapExperience(work);
    summary.push(`work: ${data.experience.length}`);
  }
  if (volunteering) {
    data.volunteering = mapExperience(volunteering);
    summary.push(`volunteering: ${data.volunteering.length}`);
  }
  if (contributions) {
    data.contributions = mapContributions(contributions);
    await localizeImages(data.contributions, "contributions");
    summary.push(`contributions: ${data.contributions.length}`);
  }
  if (testimonials) {
    data.praise = mapTestimonials(testimonials);
    summary.push(`testimonials: ${data.praise.length}`);
  }

  if (!summary.length) {
    console.log(
      "No NOTION_DB_* env vars set — nothing synced. See NOTION.md."
    );
    return;
  }

  writeData(data);
  console.log(`✅ Synced from Notion → content/data.json (${summary.join(", ")})`);
}

main().catch((err) => {
  console.error("\n✗ Sync failed:", err.body ?? err.message ?? err);
  process.exit(1);
});
