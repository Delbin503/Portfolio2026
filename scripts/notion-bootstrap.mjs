// Creates the 5 Notion databases under NOTION_PARENT_PAGE_ID and seeds each
// from the current content/data.json, so you start editing from real content.
//
//   node --env-file=.env.local scripts/notion-bootstrap.mjs
//
// Afterwards, copy the printed NOTION_DB_* lines into .env.local.
import {
  notionClient,
  readData,
  requireEnv,
  write,
  SCHEMAS,
} from "./notion-lib.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const firstHex = (s) => (s?.match(/#[0-9a-fA-F]{6}/) || ["#a78bfa"])[0];
const parseYear = (s) => (s?.match(/(\d{4})/) || [""])[0];

async function createDatabase(notion, parentPageId, schema) {
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: schema.title } }],
    properties: schema.properties,
  });
  return db.id;
}

async function seed(notion, dbId, rows) {
  for (const properties of rows) {
    await notion.pages.create({ parent: { database_id: dbId }, properties });
    await sleep(350); // stay under Notion's ~3 req/s limit
  }
}

function projectRows(data) {
  return (data.caseStudies ?? []).map((cs, i) => ({
    Name: write.title(cs.title),
    Slug: write.text(cs.slug),
    Category: write.select(cs.category),
    Year: write.text(parseYear(cs.kicker)),
    Code: write.text(cs.code),
    Metrics: write.text(cs.metrics),
    Blurb: write.text(cs.blurb),
    "Palette label": write.text(cs.paletteLabel),
    "Mock label": write.text(cs.mockLabel),
    Accent: write.text(cs.accent),
    Order: write.number(i + 1),
    Published: write.checkbox(true),
  }));
}

function experienceRows(entries) {
  return (entries ?? []).map((e, i) => ({
    Company: write.title(e.company),
    Role: write.text(e.role),
    Location: write.text(e.location),
    Period: write.text(e.period),
    Tags: write.multi(e.tags),
    Highlights: write.text((e.bullets ?? []).join("\n")),
    Order: write.number(i + 1),
    Published: write.checkbox(true),
  }));
}

function contributionRows(data) {
  return (data.contributions ?? []).map((c, i) => ({
    Title: write.title(c.title),
    Org: write.text(c.org),
    Date: write.text(c.date),
    Tone: write.select(c.tone ?? "plain"),
    Description: write.text(c.description),
    "Certificate URL": write.url(c.certificateUrl),
    Image: write.files(c.image ? [c.image] : []),
    Order: write.number(i + 1),
    Published: write.checkbox(true),
  }));
}

function testimonialRows(data) {
  return (data.praise ?? []).map((p, i) => ({
    Name: write.title(p.name),
    Title: write.text(p.title),
    Quote: write.text(p.quote),
    Accent: write.text(firstHex(p.gradient)),
    Order: write.number(i + 1),
    Published: write.checkbox(true),
  }));
}

async function main() {
  const notion = notionClient();
  const parent = requireEnv("NOTION_PARENT_PAGE_ID");
  const data = readData();

  const plan = [
    { schema: SCHEMAS.projects, rows: projectRows(data) },
    { schema: SCHEMAS.work, rows: experienceRows(data.experience) },
    { schema: SCHEMAS.volunteering, rows: experienceRows(data.volunteering) },
    { schema: SCHEMAS.contributions, rows: contributionRows(data) },
    { schema: SCHEMAS.testimonials, rows: testimonialRows(data) },
  ];

  const envLines = [];
  for (const { schema, rows } of plan) {
    process.stdout.write(`Creating "${schema.title}" database… `);
    const id = await createDatabase(notion, parent, schema);
    console.log("done");
    process.stdout.write(`  seeding ${rows.length} rows… `);
    await seed(notion, id, rows);
    console.log("done");
    envLines.push(`${schema.envKey}=${id}`);
  }

  console.log("\n✅ Databases created. Add these to your .env.local:\n");
  console.log(envLines.join("\n"));
  console.log("\nThen edit content in Notion and run: npm run notion:sync");
}

main().catch((err) => {
  console.error("\n✗ Bootstrap failed:", err.body ?? err.message ?? err);
  process.exit(1);
});
