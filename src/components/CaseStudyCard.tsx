import Link from "next/link";
import type { CaseStudy } from "@/lib/data";

const sat = { filter: "saturate(var(--sat))" } as const;

export default function CaseStudyCard({ cs }: { cs: CaseStudy }) {
  return (
    <div
      id={`cs-${cs.slug}`}
      className="mt-6 scroll-mt-24 overflow-hidden rounded-[var(--rcard)] p-5 sm:p-7"
      style={{ background: cs.cardGradient, border: `1px solid ${cs.cardBorder}` }}
    >
      {/* browser mock leads the card */}
      <div
        className="overflow-hidden rounded-[12px] bg-[#0c0b0f] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.8)]"
        style={{ ...sat, border: `1px solid ${cs.cardBorder}` }}
      >
        <div className="flex items-center gap-[6px] border-b border-[#18181f] px-[14px] py-[11px]">
          <span className="size-[9px] rounded-full bg-[#2c2c33]" />
          <span className="size-[9px] rounded-full bg-[#2c2c33]" />
          <span className="size-[9px] rounded-full bg-[#2c2c33]" />
        </div>
        <div
          className="flex h-[clamp(220px,38vw,360px)] items-center justify-center font-mono text-[11px] text-faint"
          style={{ background: cs.mockStripe }}
        >
          {cs.mockLabel}
        </div>
      </div>

      {/* meta row: text left, CTA right */}
      <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="md:max-w-[60%]">
          <div
            className="font-mono text-xs uppercase tracking-[0.14em]"
            style={{ ...sat, color: cs.accent }}
          >
            {cs.kicker}
          </div>
          <h3 className="mt-3 font-display text-[clamp(26px,4vw,40px)] font-semibold leading-[1.04] tracking-[-0.02em] text-text-strong">
            {cs.title}
          </h3>
          <p className="mt-3 max-w-[480px] text-[15px] leading-[1.6] text-muted">
            {cs.blurb}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">
          <Link
            href={`/work/${cs.slug}`}
            className="rounded-full px-[24px] py-[12px] text-[15px] font-semibold text-[#0a0a0c] transition-opacity hover:opacity-90"
            style={{ background: cs.accent }}
          >
            Read case study
          </Link>
          <Link
            href={`/work/${cs.slug}`}
            className="inline-flex items-center gap-[8px] rounded-full border px-[22px] py-[11px] text-[15px] font-semibold transition-colors hover:bg-white/[0.06]"
            style={{ color: cs.accent, borderColor: cs.accent }}
          >
            View briefing
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      {/* metrics footer */}
      <div
        className="mt-6 border-t pt-5 font-mono text-[13px]"
        style={{ ...sat, color: cs.accent, borderColor: cs.cardBorder }}
      >
        {cs.metrics}
      </div>
    </div>
  );
}
