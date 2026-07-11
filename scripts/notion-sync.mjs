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
  caseStudyMediaSlots,
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
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
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

/** Download a Notion-hosted image or video into /public/casestudies, return its path. */
async function downloadCaseImage(url, slug, order, kind = "image") {
  const dir = path.join(ROOT, "public", "casestudies");
  fs.mkdirSync(dir, { recursive: true });
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(kind === "video" ? 180000 : 45000),
    });
    if (!res.ok) return undefined;
    const pattern =
      kind === "video" ? /\.(mp4|mov|webm|m4v)$/i : /\.(png|jpe?g|webp|gif|avif|svg)$/i;
    const ext = (
      new URL(url).pathname.match(pattern)?.[1] ??
      (res.headers.get("content-type")?.split("/")[1] || (kind === "video" ? "mp4" : "png"))
    )
      .toLowerCase()
      .replace("jpeg", "jpg")
      .replace("quicktime", "mov");
    const file = `${slug}-${order}.${ext}`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(await res.arrayBuffer()));
    return `/casestudies/${file}`;
  } catch {
    return undefined;
  }
}

/**
 * Fill each project's `media` detail slots (in order) from the Project Media
 * database — download uploaded images, set video URLs + captions. Slots with
 * no uploaded asset revert to their placeholder. Re-derived every sync.
 */
async function applyProjectMedia(notion, data) {
  const projRows = await queryAll(notion, process.env.NOTION_DB_PROJECTS);
  const slugByPage = new Map();
  for (const r of projRows) {
    const slug = read.text(r.properties.Slug);
    if (slug) slugByPage.set(r.id, slug);
  }

  const rows = await queryAll(notion, process.env.NOTION_DB_PROJECT_MEDIA);
  const bySlug = new Map();
  for (const r of rows) {
    const slug = slugByPage.get(read.relation(r.properties.Project)[0]);
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(r);
  }

  let filled = 0;
  for (const cs of data.caseStudies) {
    const slots = caseStudyMediaSlots(cs);
    if (!slots.length) continue;
    const list = (bySlug.get(cs.slug) ?? []).sort(
      (a, b) =>
        (read.number(a.properties.Order) ?? 1e9) -
        (read.number(b.properties.Order) ?? 1e9)
    );
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const row = list[i];
      if (!row) {
        slot.set(undefined);
        continue;
      }
      const p = row.properties;
      const kind = slot.fixedKind ? slot.kind : read.select(p.Kind) || slot.kind || "image";
      if (!slot.fixedKind) slot.setKind(kind);
      const caption = read.text(p.Caption);
      if (kind === "video") {
        const url = read.url(p["Video URL"]);
        const uploadedFile = read.files(p.Image)[0];
        if (url) {
          slot.set(url);
          filled += 1;
        } else if (uploadedFile) {
          // No Video URL — an uploaded video file works too (e.g. a screen
          // recording dropped into the Image column instead of a hosted link).
          const local = await downloadCaseImage(
            uploadedFile,
            cs.slug,
            read.number(p.Order) ?? i + 1,
            "video"
          );
          if (local) {
            slot.set(local);
            filled += 1;
          } else slot.set(undefined);
        } else slot.set(undefined);
      } else {
        const fileUrl = read.files(p.Image)[0];
        if (fileUrl) {
          const local = await downloadCaseImage(
            fileUrl,
            cs.slug,
            read.number(p.Order) ?? i + 1
          );
          if (local) {
            slot.set(local);
            filled += 1;
          } else slot.set(undefined);
        } else slot.set(undefined);
      }
      if (caption) slot.setCaption(caption);
      slot.setMuted(kind === "video" && read.checkbox(p.Muted));
    }
  }
  return filled;
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

  // Project media (case-study image/video slots) — filled from Notion uploads.
  if (projects && process.env.NOTION_DB_PROJECT_MEDIA) {
    const filled = await applyProjectMedia(notion, data);
    summary.push(`media: ${filled}`);
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
