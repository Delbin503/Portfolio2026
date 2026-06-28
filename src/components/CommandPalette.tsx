"use client";

import { useEffect } from "react";
import type { CaseStudy } from "@/lib/data";

function jumpTo(slug: string) {
  const el = document.getElementById(`cs-${slug}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function CommandPalette({ caseStudies }: { caseStudies: CaseStudy[] }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && /^[1-6]$/.test(e.key)) {
        const cs = caseStudies[Number(e.key) - 1];
        if (cs) {
          e.preventDefault();
          jumpTo(cs.slug);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--rcard)] border border-line bg-panel">
      {/* search row */}
      <div className="flex items-center gap-[13px] border-b border-elev p-[18px]">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6a6a73"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="flex-1 text-[15px] text-dim">
          What do you want to do? Ask anything…
        </span>
        <span className="rounded-[5px] border border-[#26262c] bg-elev px-[7px] py-[2px] font-mono text-[11px] text-muted-2">
          ⌘ K
        </span>
      </div>

      <div className="px-[18px] pb-[9px] pt-[15px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
        Recommended case studies
      </div>

      {caseStudies.map((cs, i) => (
        <button
          key={cs.slug}
          type="button"
          onClick={() => jumpTo(cs.slug)}
          className={`flex items-center gap-[14px] border-b border-[#141418] px-[18px] py-[13px] text-left transition-colors hover:bg-[#131319] ${
            i === 0 ? "bg-[#0f0f16]" : ""
          }`}
        >
          <span
            className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] font-mono text-[11px] font-medium"
            style={{ background: cs.badgeBg, color: cs.accent }}
          >
            {cs.code}
          </span>
          <span className="flex-1 text-[14.5px] text-text">
            {cs.paletteLabel}
          </span>
          <span className="hidden whitespace-nowrap font-mono text-[10.5px] tracking-[0.1em] text-dim sm:inline">
            {cs.category}
          </span>
          <span className="rounded-[5px] border border-[#26262c] bg-elev px-[7px] py-[2px] font-mono text-[11px] text-muted-2">
            {cs.cmdKey}
          </span>
        </button>
      ))}

      <div className="flex items-center gap-[9px] border-t border-elev px-[18px] py-[13px] font-mono text-[11px] text-dim">
        <span>Open</span>
        <span className="rounded-[5px] border border-[#26262c] bg-elev px-[7px] py-[2px] text-muted-2">
          ↵
        </span>
        <span className="flex-1" />
        <span>Ask AI</span>
        <span className="rounded-[5px] border border-[#26262c] bg-elev px-[7px] py-[2px] text-muted-2">
          ⌘
        </span>
        <span className="rounded-[5px] border border-[#26262c] bg-elev px-[7px] py-[2px] text-muted-2">
          K
        </span>
      </div>
    </div>
  );
}
