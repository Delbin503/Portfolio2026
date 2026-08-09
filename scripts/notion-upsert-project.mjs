// Adds or updates one local case study in the existing Notion Projects DB,
// then creates any missing Project Media rows for its authored media slots.
//
//   npm run notion:upsert-project -- greenskill-rsu
import {
  notionClient,
  readData,
  requireEnv,
  write,
  read,
  queryAll,
  caseStudyMediaSlots,
} from "./notion-lib.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const parseYear = (value) => (value?.match(/(\d{4})/) || [""])[0];
const cleanLabel = (value) =>
  (value || "")
    .replace(/^\[\s*(image|video)\s*:?\s*/i, "")
    .replace(/\s*\]\s*$/, "")
    .trim();

function projectProperties(cs, order) {
  return {
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
    Order: write.number(order),
    Published: write.checkbox(true),
    "Thumbnail Kind": write.select(cs.thumbnail?.kind ?? "image"),
    "Thumbnail Video URL": write.url(
      cs.thumbnail?.kind === "video" ? cs.thumbnail.src : ""
    ),
    "Thumbnail Muted": write.checkbox(Boolean(cs.thumbnail?.muted)),
    "Thumbnail Type": write.select(
      cs.thumbnail?.device === "mobile" ? "Mobile" : "Web"
    ),
  };
}

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Pass a case-study slug, e.g. greenskill-rsu.");

  const notion = notionClient();
  const projectsDb = requireEnv("NOTION_DB_PROJECTS");
  const mediaDb = requireEnv("NOTION_DB_PROJECT_MEDIA");
  const data = readData();
  const order = data.caseStudies.findIndex((item) => item.slug === slug) + 1;
  const cs = data.caseStudies[order - 1];
  if (!cs) throw new Error(`No local case study found for slug "${slug}".`);

  const projectRows = await queryAll(notion, projectsDb);
  let project = projectRows.find(
    (row) => read.text(row.properties.Slug) === slug
  );

  if (project) {
    await notion.pages.update({
      page_id: project.id,
      properties: projectProperties(cs, order),
    });
  } else {
    project = await notion.pages.create({
      parent: { database_id: projectsDb },
      properties: projectProperties(cs, order),
    });
  }

  const mediaRows = await queryAll(notion, mediaDb);
  const existingOrders = new Set(
    mediaRows
      .filter((row) =>
        read.relation(row.properties.Project).includes(project.id)
      )
      .map((row) => read.number(row.properties.Order))
  );

  const slots = caseStudyMediaSlots(cs);
  let created = 0;
  for (let index = 0; index < slots.length; index += 1) {
    const slotOrder = index + 1;
    if (existingOrders.has(slotOrder)) continue;
    const slot = slots[index];
    const name = cleanLabel(slot.label) || `${slot.kind} ${slotOrder}`;
    await notion.pages.create({
      parent: { database_id: mediaDb },
      properties: {
        Name: write.title(`${slug} · ${name}`),
        Project: { relation: [{ id: project.id }] },
        Order: write.number(slotOrder),
        Kind: write.select(slot.kind ?? "image"),
        "Video URL": write.url(
          slot.kind === "video" ? slot.get() ?? "" : ""
        ),
        Caption: write.text(""),
        Muted: write.checkbox(slot.kind === "video"),
      },
    });
    created += 1;
    await sleep(350);
  }

  console.log(
    `✅ Upserted ${slug} and created ${created} of ${slots.length} media rows.`
  );
}

main().catch((error) => {
  console.error("✗ Notion upsert failed:", error.body ?? error.message ?? error);
  process.exit(1);
});
