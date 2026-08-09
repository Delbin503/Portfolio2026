import Link from "next/link";
import type { CaseStudy } from "@/lib/data";
import { VideoPlayer, isLocalVideoFile } from "@/components/casestudy/Sections";
import { MacMockup, PhoneMockup } from "@/components/DeviceMockup";

const sat = { filter: "saturate(var(--sat))" } as const;

export default function CaseStudyCard({ cs }: { cs: CaseStudy }) {
  const media = cs.thumbnail && (
    cs.thumbnail.kind === "video" ? (
      <VideoPlayer
        src={cs.thumbnail.src}
        muted={cs.thumbnail.muted}
        className={isLocalVideoFile(cs.thumbnail.src) ? "block w-full h-auto" : "aspect-video size-full"}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cs.thumbnail.src} alt={cs.title} className="block w-full h-auto" />
    )
  );

  return (
    <div
      id={`cs-${cs.slug}`}
      className="mt-6 scroll-mt-24 overflow-hidden rounded-[var(--rcard)] p-5 sm:p-7"
      style={{ background: cs.cardGradient, border: `1px solid ${cs.cardBorder}` }}
    >
      {/* kicker + metrics share one baseline row */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div
          className="font-mono text-xs uppercase tracking-[0.14em]"
          style={{ ...sat, color: cs.accent }}
        >
          {cs.kicker}
        </div>
        <div className="font-mono text-[12px] text-dim">{cs.metrics}</div>
      </div>

      {/* title reads before the visual */}
      <h3 className="mt-3 max-w-[720px] font-display text-[clamp(26px,4vw,40px)] font-semibold leading-[1.04] tracking-[-0.02em] text-text-strong">
        {cs.title}
      </h3>

      {/* browser mock / device mockup */}
      <div className="mt-6">
        {cs.thumbnail ? (
          cs.thumbnail.device === "mobile" ? (
            <PhoneMockup>{media}</PhoneMockup>
          ) : (
            <MacMockup>{media}</MacMockup>
          )
        ) : (
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
              className="flex h-[clamp(220px,38vw,360px)] items-center justify-center overflow-hidden px-4 text-center font-mono text-[11px] text-faint"
              style={{ background: cs.mockStripe }}
            >
              {cs.mockLabel}
            </div>
          </div>
        )}
      </div>

      {/* blurb left, single text-link CTA right */}
      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <p className="max-w-[520px] text-[15px] leading-[1.6] text-muted">{cs.blurb}</p>
        <Link
          href={`/work/${cs.slug}`}
          className="inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold transition-opacity hover:opacity-70"
          style={{ ...sat, color: cs.accent }}
        >
          Read case study <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
