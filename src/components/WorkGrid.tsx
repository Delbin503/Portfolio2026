"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Fired by the command palette / chat teaser before scrolling to a project.
 * A target sitting behind "See more" would otherwise not exist in the DOM,
 * so the jump would silently do nothing.
 */
export const EXPAND_WORK_EVENT = "delbin:expand-work";

export type WorkCard = {
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
  mockStripe: string;
  mockLabel: string;
  /** thumbnail → first media in the case study → null (striped mock) */
  media: { kind: "image" | "video"; src: string } | null;
};

const isLocalVideo = (src: string) =>
  src.startsWith("/") && /\.(mp4|mov|webm|m4v)$/i.test(src);

function Thumb({ item }: { item: WorkCard }) {
  const frame =
    "relative aspect-video w-full overflow-hidden rounded-[12px] border";

  if (!item.media) {
    return (
      <div
        className={`${frame} flex items-center justify-center px-4 text-center font-mono text-[10.5px] text-faint`}
        style={{ background: item.mockStripe, borderColor: item.cardBorder }}
      >
        {item.mockLabel}
      </div>
    );
  }

  if (item.media.kind === "video" && isLocalVideo(item.media.src)) {
    return (
      <div className={frame} style={{ borderColor: item.cardBorder, background: "#000" }}>
        {/* #t=0.1 makes browsers paint a real first frame instead of black.
            Metadata-only preload keeps eight cards cheap. */}
        <video
          src={`${item.media.src}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          aria-hidden
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  if (item.media.kind === "video") {
    // Remote embed (Vimeo/YouTube) — no cheap still, so keep the mock frame.
    return (
      <div
        className={`${frame} flex items-center justify-center px-4 text-center font-mono text-[10.5px] text-faint`}
        style={{ background: item.mockStripe, borderColor: item.cardBorder }}
      >
        {item.mockLabel}
      </div>
    );
  }

  return (
    <div className={frame} style={{ borderColor: item.cardBorder }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.media.src}
        alt={item.title}
        loading="lazy"
        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </div>
  );
}

function Card({ item }: { item: WorkCard }) {
  return (
    <Link
      id={`cs-${item.slug}`}
      href={`/work/${item.slug}`}
      data-reveal="up"
      className="group flex scroll-mt-28 flex-col gap-5 rounded-[var(--rcard)] p-5 transition-transform hover:-translate-y-1 sm:p-6"
      style={{ background: item.cardGradient, border: `1px solid ${item.cardBorder}` }}
    >
      <Thumb item={item} />

      <div className="flex items-start justify-between gap-4">
        <span
          className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] font-mono text-[11px] font-medium"
          style={{ background: item.badgeBg, color: item.accent }}
        >
          {item.code}
        </span>
        <span className="pt-1 text-right font-mono text-[10.5px] text-dim">
          {item.metrics}
        </span>
      </div>

      <div>
        <div
          className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
          style={{ color: item.accent }}
        >
          {item.category}
        </div>
        <h3 className="mt-2 font-display text-[clamp(20px,2.2vw,26px)] font-semibold leading-[1.12] text-text-strong">
          {item.title}
        </h3>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-muted">{item.blurb}</p>
      </div>

      <span
        className="mt-auto pt-1 font-mono text-[11px] transition-opacity group-hover:opacity-70"
        style={{ color: item.accent }}
      >
        Read case study →
      </span>
    </Link>
  );
}

/**
 * Every case study in one two-column grid. The first `initial` are rendered
 * up front (so they are in the SSR HTML); the rest mount on "See more" and are
 * picked up by ScrollReveal's MutationObserver, so they stagger in.
 */
export default function WorkGrid({
  items,
  initial = 4,
}: {
  items: WorkCard[];
  initial?: number;
}) {
  const [open, setOpen] = useState(false);
  const rest = items.slice(initial);

  // A jump to a project behind "See more" must reveal it first.
  useEffect(() => {
    const onExpand = () => setOpen(true);
    window.addEventListener(EXPAND_WORK_EVENT, onExpand);
    return () => window.removeEventListener(EXPAND_WORK_EVENT, onExpand);
  }, []);

  const shown = open ? items : items.slice(0, initial);

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2" data-reveal-group data-reveal-step="80">
        {shown.map((item) => (
          <Card key={item.slug} item={item} />
        ))}
      </div>

      {!open && rest.length > 0 && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            className="inline-flex items-center gap-2 rounded-full border border-[#2a2a30] px-6 py-[13px] text-[14.5px] font-semibold text-text transition-colors hover:border-[#454550] hover:bg-[#15151a]"
          >
            See {rest.length} more {rest.length === 1 ? "project" : "projects"}
            <span aria-hidden>↓</span>
          </button>
        </div>
      )}
    </div>
  );
}
