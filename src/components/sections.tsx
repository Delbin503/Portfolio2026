import SectionShell from "./SectionShell";
import type { CaseStudy } from "@/lib/data";
import {
  getCaseStudies,
  getContributions,
  getEducation,
  getExperience,
  getPraise,
  getProfile,
  getVolunteering,
} from "@/lib/data";
import ExperienceTabs from "./ExperienceTabs";
import WorkGrid, { type WorkCard } from "./WorkGrid";

const profile = getProfile();
const caseStudies = getCaseStudies();
const experience = getExperience();
const volunteering = getVolunteering();
const education = getEducation();
const contributions = getContributions();
const praise = getPraise();

/** How many cards show before the "See more" button. */
const VISIBLE_COUNT = 4;

/**
 * Card art, best available first: the project's own thumbnail, else the first
 * media slot from its case study, else null so the card falls back to the
 * striped mock. Most projects have no Notion thumbnail set, so without the
 * middle step the grid would be mostly grey placeholders.
 */
function cardMedia(cs: CaseStudy): WorkCard["media"] {
  if (cs.thumbnail?.src) {
    return { kind: cs.thumbnail.kind, src: cs.thumbnail.src };
  }
  for (const s of cs.detail?.sections ?? []) {
    if (s.type === "media" && s.src) return { kind: s.kind, src: s.src };
    if (s.type === "modules") {
      const withVideo = s.items.find((i) => i.videoUrl);
      if (withVideo?.videoUrl) return { kind: "video", src: withVideo.videoUrl };
    }
  }
  return null;
}

const workCards: WorkCard[] = caseStudies.map((cs) => ({
  slug: cs.slug,
  code: cs.code,
  category: cs.category,
  title: cs.title,
  blurb: cs.blurb,
  metrics: cs.metrics,
  accent: cs.accent,
  cardGradient: cs.cardGradient,
  cardBorder: cs.cardBorder,
  badgeBg: cs.badgeBg,
  mockStripe: cs.mockStripe,
  mockLabel: cs.mockLabel,
  media: cardMedia(cs),
}));

export function About() {
  return (
    <SectionShell id="about" num="01" title="From code to canvas to agents">
      <div
        className="grid max-w-[1000px] gap-x-12 gap-y-4 text-base leading-[1.7] text-[#a6a6af] md:grid-cols-2"
        data-reveal-group
        data-reveal-step="120"
      >
        <div className="flex flex-col gap-4" data-reveal="up">
          <p>
            Most of my work lives in the gap between what a tool can do and what
            a person needs from it. I obsess over the first ten seconds and the
            thousandth interaction equally.
          </p>
          <p>
            Lately that means agent interfaces: surfaces where software acts on
            your behalf and you stay firmly in control.
          </p>
        </div>
        <div className="flex flex-col gap-4" data-reveal="up">
          <p>
            Trust is a design problem before it&apos;s a model problem — and
            it&apos;s solved in the seams, not the slogans.
          </p>
          <div className="mt-[2px] flex flex-wrap gap-2">
            {["Design systems", "Agents", "Front-end"].map((t) => (
              <span
                key={t}
                className="rounded-[7px] border border-[#2a2a30] px-[11px] py-[6px] font-mono text-[11px] text-muted-2"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

export function SelectedWork() {
  return (
    <SectionShell
      id="work"
      num="02"
      title="Selected work"
      meta={
        <div className="font-mono text-[11px] text-dim" data-reveal="fade">
          {caseStudies.length} {caseStudies.length === 1 ? "project" : "projects"}
        </div>
      }
    >
      <WorkGrid items={workCards} initial={VISIBLE_COUNT} />
    </SectionShell>
  );
}

export function Experience() {
  return (
    <SectionShell id="experience" num="03" title="Shipped at every stop">
      <ExperienceTabs work={experience} volunteering={volunteering} />
    </SectionShell>
  );
}

export function Education() {
  return (
    <SectionShell id="education" num="04" title="Education">
      <div className="border-t border-[#1c1c22]" data-reveal-group data-reveal-step="80">
        {education.map((e) => (
          <div
            key={`${e.degree}-${e.period}`}
            data-reveal="up"
            className="grid gap-x-10 gap-y-2 border-b border-line-soft py-[28px] md:grid-cols-[170px_1fr]"
          >
            <div className="font-mono text-xs leading-none text-[#7a7a85]">
              {e.period}
            </div>
            <div>
              <div className="font-display text-[22px] leading-none">
                {e.degree}
              </div>
              <div className="mt-[10px] font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
                {e.school}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

const CONTRIBUTION_TONES: Record<string, { from: string; to: string; text: string }> = {
  pink: { from: "#2a1a20", to: "#150d11", text: "#f4a6b8" },
  amber: { from: "#2c2414", to: "#16120a", text: "#f4d28a" },
  blue: { from: "#16243a", to: "#0b1320", text: "#8ec5ff" },
  violet: { from: "#241b34", to: "#120d1c", text: "#c4a8f5" },
  green: { from: "#16302a", to: "#0a1714", text: "#5fe3c7" },
  plain: { from: "#1b1b22", to: "#0c0c10", text: "#9a9aa3" },
};

export function Contributions() {
  return (
    <SectionShell
      id="contributions"
      num="05"
      title="Beyond the day job"
      meta={
        <div
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim"
          data-reveal="fade"
        >
          {contributions.length} entries
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2" data-reveal-group data-reveal-step="90">
        {contributions.map((c) => {
          const t = CONTRIBUTION_TONES[c.tone ?? "plain"];
          return (
            <div
              key={c.title}
              tabIndex={0}
              data-reveal="scale"
              className="group relative h-[340px] cursor-default overflow-hidden rounded-[var(--rcard)] border border-line outline-none transition-colors focus-visible:border-[#3a3a44]"
            >
              {/* media: real photo when provided, else a tinted org tile */}
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.image}
                  alt={c.title}
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04] group-focus:scale-[1.04]"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center px-6"
                  style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
                >
                  <span
                    className="text-center font-display text-[28px] font-semibold leading-[1.1]"
                    style={{ color: t.text }}
                  >
                    {c.org}
                  </span>
                </div>
              )}

              {/* legibility scrim for the resting title/date */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

              {/* resting state: title + date */}
              <div className="absolute inset-x-0 bottom-0 p-6 transition-opacity duration-300 group-hover:opacity-0 group-focus:opacity-0">
                <h3 className="font-display text-[22px] font-semibold leading-[1.15] text-white">
                  {c.title}
                </h3>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-white/60">
                  {c.date}
                </div>
              </div>

              {/* hover/focus state: full description */}
              <div className="absolute inset-0 flex flex-col justify-end gap-3 bg-ink/95 p-7 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 group-focus:opacity-100">
                <div>
                  <div
                    className="font-mono text-[10.5px] uppercase tracking-[0.1em]"
                    style={{ color: t.text }}
                  >
                    {c.org}
                  </div>
                  <h3 className="mt-2 font-display text-[22px] font-semibold leading-[1.15]">
                    {c.title}
                  </h3>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
                    {c.date}
                  </div>
                </div>
                <p className="text-[14.5px] leading-[1.6] text-muted">
                  {c.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function PraiseSection() {
  if (!praise.length) return null;
  return (
    <SectionShell id="praise" num="06" title="What collaborators say">
      <div
        className="-mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 [scrollbar-width:thin] sm:-mx-10 sm:px-10"
        data-reveal-group
        data-reveal-step="90"
      >
        {praise.map((p) => (
          <div
            key={p.name}
            data-reveal="up"
            className="flex min-h-[228px] w-[300px] shrink-0 snap-start flex-col rounded-[var(--rcard)] border border-line bg-panel p-[30px] sm:w-[360px]"
          >
            <p className="font-display text-[20px] italic leading-[1.4] text-[#dcdce2]">
              &ldquo;{p.quote}&rdquo;
            </p>
            <div className="mt-auto flex items-center gap-[11px] pt-[22px]">
              <div
                className="size-[34px] shrink-0 rounded-full"
                style={{ background: p.gradient }}
              />
              <div>
                <div className="text-[13.5px] font-semibold">{p.name}</div>
                <div className="font-mono text-[11px] text-dim">{p.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function Contact() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 border-t border-line-soft pb-20 pt-24 text-center"
      data-reveal-group
      data-reveal-step="110"
    >
      <div
        className="mb-[26px] font-mono text-xs uppercase tracking-[0.16em] text-[#7a7a85]"
        data-reveal="fade"
      >
        Open to work
      </div>
      <h2
        className="mx-auto max-w-[760px] font-display text-[clamp(40px,8vw,64px)] font-semibold leading-[1.04] tracking-[-0.02em]"
        data-reveal="mask"
      >
        Complex products, intuitive interfaces —{" "}
        <span className="italic text-accent">let&apos;s build the next one.</span>
      </h2>
      <div className="mt-9 flex flex-wrap justify-center gap-3" data-reveal="up">
        <a
          href={`mailto:${profile.email}`}
          className="rounded-full bg-[#e9e9ee] px-6 py-[13px] text-[14.5px] font-semibold text-[#0a0a0c]"
        >
          {profile.email}
        </a>
        <a
          href="https://drive.google.com/file/d/1opS1NsXP-Boy0AMMkkaHGyx6ayuOJ9iD/view"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-[#2a2a30] px-6 py-[13px] text-[14.5px] font-semibold text-text"
        >
          View résumé ↗
        </a>
      </div>
      <div className="mt-16 font-mono text-[11.5px] text-faint" data-reveal="fade">
        © 2026 {profile.name}
      </div>
    </section>
  );
}
