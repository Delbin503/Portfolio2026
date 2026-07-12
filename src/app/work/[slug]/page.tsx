import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCaseStudies } from "@/lib/data";
import { defaultSections } from "@/lib/caseStudyDefaults";
import CaseStudySections, { VideoPlayer } from "@/components/casestudy/Sections";
import { RelatedCaseStudies, CtaBand } from "@/components/casestudy/Footer";

export function generateStaticParams() {
  return getCaseStudies().map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cs = getCaseStudies().find((c) => c.slug === slug);
  if (!cs) return {};
  return {
    title: cs.title.replace(/\.$/, ""),
    description: cs.detail?.summary ?? cs.blurb,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const all = getCaseStudies();
  const cs = all.find((c) => c.slug === slug);
  if (!cs) notFound();

  const sections = cs.detail?.sections ?? defaultSections(cs);
  const ctx = {
    accent: cs.accent,
    buttonBg: cs.buttonBg,
    stripe: cs.mockStripe,
    border: cs.cardBorder,
  };

  return (
    <article className="mx-auto max-w-[900px] px-6 pb-28 pt-[72px] sm:px-10">
      <Link
        href="/#work"
        className="font-mono text-xs uppercase tracking-[0.1em] text-dim transition-colors hover:text-text"
      >
        ← Back to work
      </Link>

      {/* hero */}
      <header className="mt-10">
        <div
          className="font-mono text-xs uppercase tracking-[0.14em]"
          style={{ color: cs.accent }}
        >
          {cs.kicker}
        </div>
        <h1 className="mt-4 max-w-[760px] font-display text-[clamp(40px,8vw,68px)] font-semibold leading-[1.0] tracking-[-0.02em] text-text-strong">
          {cs.title}
        </h1>
        {cs.detail?.subtitle && (
          <div
            className="mt-2 max-w-[760px] font-display text-[clamp(24px,5vw,40px)] font-medium italic leading-[1.05]"
            style={{ color: cs.accent }}
          >
            {cs.detail.subtitle}
          </div>
        )}
        <div className="mt-5 font-mono text-[13px]" style={{ color: cs.accent }}>
          {cs.metrics}
        </div>
        <p className="mt-6 max-w-[600px] text-[18px] leading-[1.6] text-muted">
          {cs.detail?.summary ?? cs.blurb}
        </p>
      </header>

      {/* hero mockup */}
      <div
        className="mt-12 overflow-hidden rounded-[var(--rmock)] bg-[#0c0b0f]"
        style={{ border: `1px solid ${cs.cardBorder}` }}
      >
        <div className="flex items-center gap-[6px] border-b border-[#18181f] px-[14px] py-[11px]">
          <span className="size-[9px] rounded-full bg-[#2c2c33]" />
          <span className="size-[9px] rounded-full bg-[#2c2c33]" />
          <span className="size-[9px] rounded-full bg-[#2c2c33]" />
        </div>
        <div
          className="flex h-[380px] items-center justify-center overflow-hidden font-mono text-[11px] text-faint"
          style={cs.thumbnail ? undefined : { background: cs.mockStripe }}
        >
          {cs.thumbnail ? (
            cs.thumbnail.kind === "video" ? (
              <VideoPlayer src={cs.thumbnail.src} muted={cs.thumbnail.muted} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cs.thumbnail.src}
                alt={cs.title}
                className="size-full object-cover"
              />
            )
          ) : (
            cs.mockLabel
          )}
        </div>
      </div>

      {/* body sections */}
      <div className="mt-24">
        <CaseStudySections sections={sections} ctx={ctx} />
      </div>

      <RelatedCaseStudies current={cs.slug} all={all} />
      <CtaBand buttonBg={cs.buttonBg} />
    </article>
  );
}
