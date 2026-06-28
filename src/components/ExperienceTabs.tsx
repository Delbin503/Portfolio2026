"use client";

import { useState } from "react";
import type { ExperienceEntry } from "@/lib/data";

function Timeline({ entries }: { entries: ExperienceEntry[] }) {
  return (
    <div className="border-t border-[#1c1c22]">
      {entries.map((e) => (
        <div
          key={`${e.company}-${e.period}`}
          className="grid gap-x-10 gap-y-5 border-b border-line-soft py-[34px] md:grid-cols-[170px_1fr]"
        >
          <div className="font-mono text-xs leading-none text-[#7a7a85]">
            {e.period}
          </div>
          <div>
            <div className="grid items-start gap-6 md:grid-cols-[1.1fr_1fr_auto]">
              <div>
                <div className="font-display text-[23px] leading-none">
                  {e.company}
                </div>
                <div className="mt-[10px] font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
                  {e.location}
                </div>
              </div>
              <div className="text-[15px] leading-none text-[#c9c9d0]">
                {e.role}
              </div>
              <div className="flex max-w-[240px] flex-wrap gap-[7px] md:justify-end">
                {e.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-[6px] border border-[#2a2a30] px-[9px] py-[5px] font-mono text-[10px] uppercase tracking-[0.04em] text-muted-2"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-[9px] text-[14.5px] leading-[1.5] text-muted">
              {e.bullets.map((b) => (
                <div key={b} className="flex gap-[10px]">
                  <span className="text-faint">—</span>
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type TabKey = "work" | "volunteering";

export default function ExperienceTabs({
  work,
  volunteering,
}: {
  work: ExperienceEntry[];
  volunteering: ExperienceEntry[];
}) {
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "work", label: "Work", count: work.length },
    { key: "volunteering", label: "Volunteering", count: volunteering.length },
  ];
  const [active, setActive] = useState<TabKey>("work");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Experience categories"
        className="mb-9 flex flex-wrap gap-2"
      >
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.08em] transition-colors ${
                on
                  ? "border-transparent bg-[#1a1a20] text-text"
                  : "border-[#26262c] text-dim hover:text-text"
              }`}
            >
              {t.label}
              <span
                className={`font-mono text-[10px] ${
                  on ? "text-accent" : "text-faint"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {active === "work" ? (
        <Timeline entries={work} />
      ) : (
        <Timeline entries={volunteering} />
      )}
    </div>
  );
}
