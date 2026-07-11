// Creates the "Project Media" database and seeds one row per image/video slot
// on each project's case-study page, so you just drag assets into each row.
//
//   node --env-file=.env.local scripts/notion-bootstrap-media.mjs
//
// Afterwards, copy the printed NOTION_DB_PROJECT_MEDIA line into .env.local.
import {
  notionClient,
  readData,
  requireEnv,
  write,
  read,
  queryAll,
  SCHEMAS,
  caseStudyMediaSlots,
} from "./notion-lib.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// "[ IMAGE: User flow ]" -> "User flow"
const cleanLabel = (s) =>
  (s || "")
    .replace(/^\[\s*(image|video)\s*:?\s*/i, "")
    .replace(/\s*\]\s*$/, "")
    .trim();

async function main() {
  const notion = notionClient();
  const parent = requireEnv("NOTION_PARENT_PAGE_ID");
  const projectsDb = requireEnv("NOTION_DB_PROJECTS");
  const data = readData();

  // slug -> project page id
  const projectRows = await queryAll(notion, projectsDb);
  const pageBySlug = new Map();
  for (const r of projectRows) {
    const slug = read.text(r.properties.Slug);
    if (slug) pageBySlug.set(slug, r.id);
  }

  // Create the Project Media database with a relation to Projects.
  process.stdout.write('Creating "Project Media" database… ');
  const schema = SCHEMAS.projectMedia;
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: parent },
    title: [{ type: "text", text: { content: schema.title } }],
    properties: {
      ...schema.properties,
      Project: { relation: { database_id: projectsDb, single_property: {} } },
    },
  });
  console.log("done");

  // Seed one row per media slot.
  let total = 0;
  for (const cs of data.caseStudies ?? []) {
    const pageId = pageBySlug.get(cs.slug);
    const slots = caseStudyMediaSlots(cs);
    if (!slots.length) continue;
    process.stdout.write(`  ${cs.slug}: ${slots.length} media slots… `);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const name = cleanLabel(slot.label) || `${slot.kind} ${i + 1}`;
      const props = {
        Name: write.title(`${cs.slug} · ${name}`),
        Order: write.number(i + 1),
        Kind: write.select(slot.kind ?? "image"),
        "Video URL": write.url(slot.kind === "video" ? slot.get() ?? "" : ""),
        Caption: write.text(""),
      };
      if (pageId) props.Project = { relation: [{ id: pageId }] };
      await notion.pages.create({ parent: { database_id: db.id }, properties: props });
      total += 1;
      await sleep(330);
    }
    console.log("done");
  }

  console.log(`\n✅ Seeded ${total} media slots. Add this to your .env.local:\n`);
  console.log(`NOTION_DB_PROJECT_MEDIA=${db.id}`);
  console.log(
    "\nThen drag images into the Image column (or paste a Video URL) and run: npm run notion:sync"
  );
}

main().catch((err) => {
  console.error("\n✗ Bootstrap-media failed:", err.body ?? err.message ?? err);
  process.exit(1);
});
