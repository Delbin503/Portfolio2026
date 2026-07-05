// Shared helpers for the Notion CMS pipeline (bootstrap + sync).
// Classic Notion API (SDK v2.x): databases.create / databases.query / pages.create.
import { Client } from "@notionhq/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const DATA_PATH = path.join(ROOT, "content", "data.json");

export function notionClient() {
  const auth = process.env.NOTION_TOKEN;
  if (!auth) {
    throw new Error(
      "NOTION_TOKEN is not set. Add it to .env.local (see NOTION.md)."
    );
  }
  return new Client({ auth });
}

export function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

export function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
}

/* ── property readers (Notion page → value) ──────────────────── */
export const read = {
  title: (p) => p?.title?.map((t) => t.plain_text).join("") ?? "",
  text: (p) => p?.rich_text?.map((t) => t.plain_text).join("") ?? "",
  select: (p) => p?.select?.name ?? "",
  multi: (p) => p?.multi_select?.map((s) => s.name) ?? [],
  number: (p) => (typeof p?.number === "number" ? p.number : null),
  checkbox: (p) => p?.checkbox ?? false,
  url: (p) => p?.url ?? "",
  relation: (p) => (p?.relation ?? []).map((r) => r.id),
  // Files & media property → array of URLs (uploaded files + external links)
  files: (p) =>
    (p?.files ?? [])
      .map((f) => (f.type === "external" ? f.external?.url : f.file?.url))
      .filter(Boolean),
  // rich_text split on newlines → array of non-empty lines
  lines: (p) =>
    (p?.rich_text?.map((t) => t.plain_text).join("") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
};

/* ── property builders (value → Notion property) ─────────────── */
export const write = {
  title: (s) => ({ title: [{ text: { content: String(s ?? "") } }] }),
  text: (s) => ({ rich_text: [{ text: { content: String(s ?? "") } }] }),
  select: (s) => (s ? { select: { name: String(s) } } : { select: null }),
  multi: (arr) => ({ multi_select: (arr ?? []).map((name) => ({ name })) }),
  number: (n) => ({ number: typeof n === "number" ? n : null }),
  checkbox: (b) => ({ checkbox: Boolean(b) }),
  url: (s) => ({ url: s ? String(s) : null }),
  files: (urls) => ({
    files: (urls ?? [])
      .filter(Boolean)
      .map((u, i) => ({ type: "external", name: `image-${i + 1}`, external: { url: u } })),
  }),
};

/* ── color theming: derive a full palette from one accent hex ── */
const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const toRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb) =>
  "#" + rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
const mix = (hex, target, amt) => {
  const a = toRgb(hex);
  const b = toRgb(target);
  return toHex(a.map((v, i) => v + (b[i] - v) * amt));
};
const INK = "#08080a";

/**
 * Given an accent hex, derive the style fields a CaseStudy card needs.
 * Keeps the Notion schema content-only — designers pick one color.
 */
export function themeFromAccent(accent) {
  const a = accent || "#a78bfa";
  const tintTop = mix(a, INK, 0.86);
  const tintBot = mix(a, INK, 0.93);
  const stripeA = mix(a, INK, 0.9);
  const stripeB = mix(a, INK, 0.84);
  return {
    accent: a,
    buttonBg: mix(a, "#000000", 0.42),
    cardGradient: `linear-gradient(180deg,${tintTop},${tintBot})`,
    cardBorder: mix(a, INK, 0.8),
    badgeBg: mix(a, INK, 0.84),
    mockStripe: `repeating-linear-gradient(135deg,${stripeA},${stripeA} 11px,${stripeB} 11px,${stripeB} 22px)`,
  };
}

/** Gradient swatch for a testimonial avatar, derived from accent. */
export function testimonialGradient(accent) {
  const a = accent || "#a78bfa";
  return `linear-gradient(135deg,${a},${mix(a, "#000000", 0.45)})`;
}

/* ── database schemas (property name → Notion config) ────────── */
export const SCHEMAS = {
  projects: {
    envKey: "NOTION_DB_PROJECTS",
    title: "Projects",
    properties: {
      Name: { title: {} },
      Slug: { rich_text: {} },
      Category: { select: {} },
      Year: { rich_text: {} },
      Code: { rich_text: {} },
      Metrics: { rich_text: {} },
      Blurb: { rich_text: {} },
      "Palette label": { rich_text: {} },
      "Mock label": { rich_text: {} },
      Accent: { rich_text: {} },
      Order: { number: { format: "number" } },
      Published: { checkbox: {} },
    },
  },
  work: {
    envKey: "NOTION_DB_WORK",
    title: "Work",
    properties: {
      Company: { title: {} },
      Role: { rich_text: {} },
      Location: { rich_text: {} },
      Period: { rich_text: {} },
      Tags: { multi_select: {} },
      Highlights: { rich_text: {} },
      Order: { number: { format: "number" } },
      Published: { checkbox: {} },
    },
  },
  volunteering: {
    envKey: "NOTION_DB_VOLUNTEERING",
    title: "Volunteering",
    properties: {
      Company: { title: {} },
      Role: { rich_text: {} },
      Location: { rich_text: {} },
      Period: { rich_text: {} },
      Tags: { multi_select: {} },
      Highlights: { rich_text: {} },
      Order: { number: { format: "number" } },
      Published: { checkbox: {} },
    },
  },
  contributions: {
    envKey: "NOTION_DB_CONTRIBUTIONS",
    title: "Contributions",
    properties: {
      Title: { title: {} },
      Org: { rich_text: {} },
      Date: { rich_text: {} },
      Tone: {
        select: {
          options: [
            { name: "pink" },
            { name: "amber" },
            { name: "blue" },
            { name: "violet" },
            { name: "green" },
            { name: "plain" },
          ],
        },
      },
      Description: { rich_text: {} },
      "Certificate URL": { url: {} },
      Image: { files: {} },
      Order: { number: { format: "number" } },
      Published: { checkbox: {} },
    },
  },
  testimonials: {
    envKey: "NOTION_DB_TESTIMONIALS",
    title: "Testimonials",
    properties: {
      Name: { title: {} },
      Title: { rich_text: {} },
      Quote: { rich_text: {} },
      Accent: { rich_text: {} },
      Order: { number: { format: "number" } },
      Published: { checkbox: {} },
    },
  },
  // One row per image/video slot on a case-study page. Upload into `Image` or
  // paste a `Video URL`; sync fills the project's media slots in `Order`.
  // Project relation is added dynamically in bootstrap (needs Projects DB id).
  projectMedia: {
    envKey: "NOTION_DB_PROJECT_MEDIA",
    title: "Project Media",
    properties: {
      Name: { title: {} },
      Order: { number: { format: "number" } },
      Kind: {
        select: { options: [{ name: "image" }, { name: "video" }] },
      },
      Image: { files: {} },
      "Video URL": { url: {} },
      Caption: { rich_text: {} },
    },
  },
};

/** Query every row of a database, following pagination. */
export async function queryAll(notion, database_id) {
  const rows = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return rows;
}

export function requireEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set. See NOTION.md / .env.local.`);
  return v;
}
