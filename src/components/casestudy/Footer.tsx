import Link from "next/link";
import type { CaseStudy } from "@/lib/data";

export function RelatedCaseStudies({
  current,
  all,
}: {
  current: string;
  all: CaseStudy[];
}) {
  const others = all.filter((c) => c.slug !== current).slice(0, 3);
  if (!others.length) return null;

  return (
    <section className="mt-24 border-t border-line-soft pt-16">
      <div className="mb-8 flex items-baseline gap-4">
        <span className="font-mono text-xs tracking-[0.06em] text-accent">↗</span>
        <h2 className="font-display text-[28px] font-semibold tracking-[-0.01em]">
          Related case studies
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {others.map((cs) => (
          <Link
            key={cs.slug}
            href={`/work/${cs.slug}`}
            className="group flex flex-col gap-4 rounded-[var(--rcard)] p-7 transition-transform hover:-translate-y-1"
            style={{
              background: cs.cardGradient,
              border: `1px solid ${cs.cardBorder}`,
            }}
          >
            <span
              className="flex size-[34px] items-center justify-center rounded-[9px] font-mono text-[12px] font-medium"
              style={{ background: cs.badgeBg, color: cs.accent }}
            >
              {cs.code}
            </span>
            <div>
              <div
                className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
                style={{ color: cs.accent }}
              >
                {cs.category}
              </div>
              <h3 className="mt-2 font-display text-[20px] font-semibold leading-[1.12] text-text-strong">
                {cs.title}
              </h3>
            </div>
            <span
              className="mt-auto font-mono text-[11px] text-dim transition-colors group-hover:text-text"
              style={{ color: cs.accent }}
            >
              Read case study →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CtaBand({ buttonBg }: { buttonBg: string }) {
  return (
    <section className="mt-20 rounded-[var(--rcard)] border border-line bg-[#0a0a0d] px-8 py-16 text-center sm:px-12">
      <div className="font-mono text-xs uppercase tracking-[0.16em] text-dim">
        Available Q3 2026
      </div>
      <h2 className="mx-auto mt-6 max-w-[640px] font-display text-[clamp(32px,6vw,52px)] font-semibold leading-[1.05] tracking-[-0.02em]">
        Let&apos;s build something{" "}
        <span className="italic text-accent">great.</span>
      </h2>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href="mailto:hello@mayachen.studio"
          className="rounded-full px-6 py-[13px] text-[14.5px] font-semibold text-white"
          style={{ background: buttonBg }}
        >
          hello@mayachen.studio
        </a>
        <Link
          href="/#work"
          className="rounded-full border border-[#2a2a30] px-6 py-[13px] text-[14.5px] font-semibold text-text"
        >
          See more work
        </Link>
      </div>
    </section>
  );
}
