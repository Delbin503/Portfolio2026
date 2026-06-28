"use client";

import { useEffect, useState, useCallback } from "react";
import type { ContentData, CaseStudy, MoreProject, WritingEntry, ExperienceEntry, Praise, HeroStat } from "@/lib/data";

// ─── types ──────────────────────────────────────────────────────────────────

type Section = "caseStudies" | "moreProjects" | "writing" | "experience" | "praise" | "heroStats";

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "caseStudies", label: "Case Studies", icon: "◈" },
  { key: "moreProjects", label: "More Projects", icon: "◇" },
  { key: "writing", label: "Writing", icon: "✦" },
  { key: "experience", label: "Experience", icon: "◉" },
  { key: "praise", label: "Praise", icon: "◎" },
  { key: "heroStats", label: "Hero Stats", icon: "⊞" },
];

// ─── field configs per section ───────────────────────────────────────────────

type FieldDef = { key: string; label: string; type: "text" | "textarea" | "tags" | "bullets" };

const FIELDS: Record<Section, FieldDef[]> = {
  caseStudies: [
    { key: "slug", label: "Slug", type: "text" },
    { key: "cmdKey", label: "Cmd Key", type: "text" },
    { key: "code", label: "Code", type: "text" },
    { key: "category", label: "Category", type: "text" },
    { key: "kicker", label: "Kicker", type: "text" },
    { key: "paletteLabel", label: "Palette Label", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "metrics", label: "Metrics", type: "text" },
    { key: "blurb", label: "Blurb", type: "textarea" },
    { key: "mockLabel", label: "Mock Label", type: "text" },
    { key: "accent", label: "Accent Color", type: "text" },
    { key: "buttonBg", label: "Button BG", type: "text" },
    { key: "cardGradient", label: "Card Gradient", type: "textarea" },
    { key: "cardBorder", label: "Card Border", type: "text" },
    { key: "badgeBg", label: "Badge BG", type: "text" },
    { key: "mockStripe", label: "Mock Stripe", type: "textarea" },
  ],
  moreProjects: [
    { key: "num", label: "Number", type: "text" },
    { key: "category", label: "Category", type: "text" },
    { key: "categoryColor", label: "Category Color", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "blurb", label: "Blurb", type: "textarea" },
  ],
  writing: [
    { key: "slug", label: "Slug", type: "text" },
    { key: "date", label: "Date", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "excerpt", label: "Excerpt", type: "textarea" },
  ],
  experience: [
    { key: "period", label: "Period", type: "text" },
    { key: "company", label: "Company", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "role", label: "Role", type: "text" },
    { key: "tags", label: "Tags", type: "tags" },
    { key: "bullets", label: "Bullets", type: "bullets" },
  ],
  praise: [
    { key: "quote", label: "Quote", type: "textarea" },
    { key: "name", label: "Name", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "gradient", label: "Gradient", type: "text" },
  ],
  heroStats: [
    { key: "value", label: "Value", type: "text" },
    { key: "plus", label: "Plus (+)", type: "text" },
    { key: "label", label: "Label", type: "text" },
  ],
};

function rowTitle(section: Section, item: Record<string, unknown>): string {
  switch (section) {
    case "caseStudies": return (item.title as string) ?? (item.slug as string);
    case "moreProjects": return `${item.num} — ${item.title}`;
    case "writing": return item.title as string;
    case "experience": return `${item.company} · ${item.role}`;
    case "praise": return `${item.name} · ${item.title}`;
    case "heroStats": return `${item.value}${item.plus ? "+" : ""} ${item.label}`;
    default: return "";
  }
}

function rowMeta(section: Section, item: Record<string, unknown>): string {
  switch (section) {
    case "caseStudies": return item.category as string;
    case "moreProjects": return item.category as string;
    case "writing": return item.date as string;
    case "experience": return item.period as string;
    case "praise": return "";
    case "heroStats": return "";
    default: return "";
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({ value }: { value: string }) {
  const isGrad = value.includes("gradient") || value.includes("linear");
  if (isGrad) return null;
  return (
    <span
      className="inline-block size-3 shrink-0 rounded-sm border border-white/10"
      style={{ background: value }}
    />
  );
}

function TagsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[#2a2a35] bg-[#0f0f14] p-2">
      {value.map((t, i) => (
        <span
          key={i}
          className="flex items-center gap-1 rounded-sm bg-[#1e1e28] px-2 py-0.5 text-xs text-[#c4c4cc]"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-[#555] hover:text-[#ff6b6b]"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
            e.preventDefault();
            onChange([...value, draft.trim()]);
            setDraft("");
          }
        }}
        placeholder="Add tag…"
        className="min-w-[80px] flex-1 bg-transparent text-xs text-[#c4c4cc] placeholder-[#444] outline-none"
      />
    </div>
  );
}

function BulletsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {value.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 text-xs text-[#444]">–</span>
          <textarea
            value={b}
            onChange={(e) => {
              const next = [...value];
              next[i] = e.target.value;
              onChange(next);
            }}
            rows={2}
            className="flex-1 resize-none rounded-md border border-[#2a2a35] bg-[#0f0f14] px-3 py-2 text-sm text-[#c4c4cc] outline-none focus:border-[#4a4a5a] placeholder-[#444]"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="mt-2 text-[#555] transition-colors hover:text-[#ff6b6b]"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="mt-1 w-fit rounded-md border border-dashed border-[#2a2a35] px-3 py-1.5 text-xs text-[#555] transition-colors hover:border-[#4a4a5a] hover:text-[#888]"
      >
        + Add bullet
      </button>
    </div>
  );
}

// ─── editor panel ─────────────────────────────────────────────────────────────

function EditorPanel({
  section,
  item,
  onClose,
  onSave,
}: {
  section: Section;
  item: Record<string, unknown>;
  onClose: () => void;
  onSave: (updated: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...item });

  function set(key: string, value: unknown) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const fields = FIELDS[section];

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className="flex items-center justify-between border-b border-[#1e1e28] px-6 py-4">
        <span className="text-sm font-medium text-[#e0e0ea]">
          {rowTitle(section, draft)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs text-[#666] transition-colors hover:text-[#aaa]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-md bg-[#5a4fcf] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#6a5fdf]"
          >
            Save
          </button>
        </div>
      </div>

      {/* fields */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {fields.map((f) => {
          const val = draft[f.key];

          if (f.type === "tags") {
            return (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">{f.label}</label>
                <TagsEditor
                  value={(val as string[]) ?? []}
                  onChange={(v) => set(f.key, v)}
                />
              </div>
            );
          }

          if (f.type === "bullets") {
            return (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">{f.label}</label>
                <BulletsEditor
                  value={(val as string[]) ?? []}
                  onChange={(v) => set(f.key, v)}
                />
              </div>
            );
          }

          if (f.type === "textarea") {
            return (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">{f.label}</label>
                <textarea
                  rows={3}
                  value={(val as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="resize-none rounded-md border border-[#2a2a35] bg-[#0f0f14] px-3 py-2.5 text-sm text-[#c4c4cc] outline-none focus:border-[#4a4a5a] placeholder-[#444]"
                />
              </div>
            );
          }

          // text
          const strVal = String(val ?? "");
          const isColor = strVal.startsWith("#");
          return (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">{f.label}</label>
              <div className="flex items-center gap-2">
                {isColor && <ColorSwatch value={strVal} />}
                <input
                  type="text"
                  value={strVal}
                  onChange={(e) => {
                    const raw = e.target.value;
                    // convert "true"/"false" back to boolean for `plus`
                    if (f.key === "plus") {
                      set(f.key, raw === "true");
                    } else {
                      set(f.key, raw);
                    }
                  }}
                  className="flex-1 rounded-md border border-[#2a2a35] bg-[#0f0f14] px-3 py-2 text-sm text-[#c4c4cc] outline-none focus:border-[#4a4a5a] placeholder-[#444]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [data, setData] = useState<ContentData | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("caseStudies");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const save = useCallback(async (next: ContentData) => {
    setSaving(true);
    await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
    setData(next);
  }, []);

  function handleItemSave(updated: Record<string, unknown>) {
    if (!data || editingIndex === null) return;
    const list = [...(data[activeSection] as Record<string, unknown>[])];
    list[editingIndex] = updated;
    const next = { ...data, [activeSection]: list };
    save(next as ContentData);
    setEditingIndex(null);
  }

  function handleAdd() {
    if (!data) return;
    const fields = FIELDS[activeSection];
    const blank: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.type === "tags" || f.type === "bullets") blank[f.key] = [];
      else blank[f.key] = "";
    });
    const list = [...(data[activeSection] as Record<string, unknown>[]), blank];
    const next = { ...data, [activeSection]: list };
    setData(next as ContentData);
    setEditingIndex(list.length - 1);
  }

  function handleDelete(idx: number) {
    if (!data) return;
    if (!confirm("Delete this entry?")) return;
    const list = (data[activeSection] as Record<string, unknown>[]).filter((_, i) => i !== idx);
    const next = { ...data, [activeSection]: list };
    save(next as ContentData);
  }

  const items = data ? (data[activeSection] as Record<string, unknown>[]) : [];
  const editingItem = editingIndex !== null ? items[editingIndex] : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0e] text-[#c4c4cc]" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#1a1a24] bg-[#0d0d12]">
        <div className="border-b border-[#1a1a24] px-5 py-4">
          <div className="text-xs font-mono uppercase tracking-widest text-[#444]">Portfolio</div>
          <div className="mt-0.5 text-sm font-semibold text-[#e0e0ea]">Content</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => { setActiveSection(s.key); setEditingIndex(null); }}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeSection === s.key
                  ? "bg-[#1a1a28] text-[#e0e0ea]"
                  : "text-[#666] hover:bg-[#141420] hover:text-[#aaa]"
              }`}
            >
              <span className="text-[10px] opacity-60">{s.icon}</span>
              {s.label}
              {data && (
                <span className="ml-auto text-[10px] text-[#444]">
                  {(data[s.key] as unknown[]).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-[#1a1a24] px-5 py-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#444] transition-colors hover:text-[#888]"
          >
            ↗ View site
          </a>
        </div>
      </aside>

      {/* main */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* top bar */}
        <header className="flex items-center justify-between border-b border-[#1a1a24] px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold text-[#e0e0ea]">
              {SECTIONS.find((s) => s.key === activeSection)?.label}
            </h1>
            {savedAt && !saving && (
              <p className="text-[11px] text-[#444]">Saved at {savedAt}</p>
            )}
            {saving && <p className="text-[11px] text-[#5a4fcf]">Saving…</p>}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-md bg-[#1a1a28] px-3 py-1.5 text-xs font-medium text-[#c4c4cc] transition-colors hover:bg-[#22223a]"
          >
            <span className="text-base leading-none">+</span>
            New entry
          </button>
        </header>

        {/* split: list + editor */}
        <div className="flex flex-1 overflow-hidden">

          {/* list */}
          <div className={`flex flex-col overflow-y-auto border-r border-[#1a1a24] ${editingItem ? "w-[340px] shrink-0" : "flex-1"}`}>
            {!data && (
              <div className="flex flex-1 items-center justify-center text-sm text-[#444]">
                Loading…
              </div>
            )}
            {data && items.length === 0 && (
              <div className="flex flex-1 items-center justify-center text-sm text-[#444]">
                No entries yet.
              </div>
            )}
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setEditingIndex(i === editingIndex ? null : i)}
                className={`group flex items-start gap-3 border-b border-[#13131c] px-5 py-3.5 text-left transition-colors ${
                  editingIndex === i ? "bg-[#14142a]" : "hover:bg-[#111118]"
                }`}
              >
                <span className="mt-0.5 w-5 shrink-0 font-mono text-[10px] text-[#333]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm text-[#d0d0da]">
                    {rowTitle(activeSection, item)}
                  </span>
                  {rowMeta(activeSection, item) && (
                    <span className="font-mono text-[10px] text-[#444]">
                      {rowMeta(activeSection, item)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
                  className="shrink-0 text-[#333] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#ff6b6b]"
                  title="Delete"
                >
                  ×
                </button>
              </button>
            ))}
          </div>

          {/* editor */}
          {editingItem && (
            <div className="flex-1 overflow-hidden">
              <EditorPanel
                section={activeSection}
                item={editingItem}
                onClose={() => setEditingIndex(null)}
                onSave={handleItemSave}
              />
            </div>
          )}

          {/* empty state when no item selected */}
          {!editingItem && data && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[#333]">
              <span className="text-3xl">◈</span>
              <p className="text-sm">Select an entry to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
