"use client";

import { useState } from "react";
import Link from "next/link";

/** Just the fields the compact card needs — keeps the client payload small. */
export type CompactStudy = {
  slug: string;
  code: string;
  category: string;
  title: string;
  blurb: string;
  metrics: string;
  accent: string;
  cardGradient: string;
  cardBorder: string;
  badgeBg: string;
};

/**
 * The tail of the Selected work list. Hidden behind a "See more" button and
 * laid out two-up, so the page leads with the strongest studies at full size.
 * Expanded items mount into the DOM, so ScrollReveal picks them up and
 * staggers them in.
 */
export default function MoreWorkGrid({ items }: { items: CompactStudy[] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <div className="mt-10">
      {!open && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            className="inline-flex items-center gap-2 rounded-full border border-[#2a2a30] px-6 py-[13px] text-[14.5px] font-semibold text-text transition-colors hover:border-[#454550] hover:bg-[#15151a]"
          >
            See {items.length} more {items.length === 1 ? "project" : "projects"}
            <span aria-hidden>↓</span>
          </button>
        </div>
      )}

      {open && (
        <div className="grid gap-5 md:grid-cols-2" data-reveal-group data-reveal-step="80">
          {items.map((cs) => (
            <Link
              key={cs.slug}
              href={`/work/${cs.slug}`}
              data-reveal="up"
              className="group flex flex-col gap-4 rounded-[var(--rcard)] p-7 transition-transform hover:-translate-y-1"
              style={{ background: cs.cardGradient, border: `1px solid ${cs.cardBorder}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] font-mono text-[12px] font-medium"
                  style={{ background: cs.badgeBg, color: cs.accent }}
                >
                  {cs.code}
                </span>
                <span className="pt-[6px] text-right font-mono text-[10.5px] text-dim">
                  {cs.metrics}
                </span>
              </div>
              <div>
                <div
                  className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
                  style={{ color: cs.accent }}
                >
                  {cs.category}
                </div>
                <h3 className="mt-2 font-display text-[22px] font-semibold leading-[1.12] text-text-strong">
                  {cs.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.6] text-muted">{cs.blurb}</p>
              </div>
              <span
                className="mt-auto pt-2 font-mono text-[11px] transition-opacity group-hover:opacity-70"
                style={{ color: cs.accent }}
              >
                Read case study →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
