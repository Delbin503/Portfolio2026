import type { CaseStudySection, Tone } from "@/lib/data";

type Toned = { bg: string; border: string; text: string };

const TONES: Record<Tone, Toned> = {
  pink: { bg: "#1a1116", border: "#2a1a20", text: "#f4a6b8" },
  amber: { bg: "#1a1610", border: "#2c2414", text: "#f4d28a" },
  blue: { bg: "#0e1622", border: "#16243a", text: "#8ec5ff" },
  violet: { bg: "#15101f", border: "#241b34", text: "#c4a8f5" },
  green: { bg: "#0c1513", border: "#16302a", text: "#5fe3c7" },
  plain: { bg: "#0c0c10", border: "#1b1b22", text: "#9a9aa3" },
};

const toneOf = (t?: Tone): Toned => TONES[t ?? "plain"];

/* ── shared bits ─────────────────────────────────────────────── */

function SectionHeader({
  num,
  eyebrow,
  title,
  subhead,
  intro,
  accent,
}: {
  num?: string;
  eyebrow?: string;
  title: string;
  subhead?: string;
  intro?: string;
  accent: string;
}) {
  const kicker = [num, eyebrow].filter(Boolean).join("  ·  ");
  return (
    <header className="mb-9 max-w-[680px]">
      {kicker && (
        <div
          className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em]"
          style={{ color: accent }}
        >
          {kicker}
        </div>
      )}
      <h2 className="font-display text-[clamp(28px,5vw,40px)] font-semibold leading-[1.05] tracking-[-0.01em] text-text-strong">
        {title}
      </h2>
      {subhead && (
        <p className="mt-3 text-[18px] font-medium leading-[1.4] text-[#c9c9d0]">
          {subhead}
        </p>
      )}
      {intro && (
        <p className="mt-4 text-[17px] leading-[1.65] text-muted">{intro}</p>
      )}
    </header>
  );
}

/** Vimeo/YouTube URL → embeddable iframe src. `muted` starts the player silent. */
function embedSrc(url: string, muted?: boolean): string {
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}${muted ? "?muted=1" : ""}`;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}${muted ? "?mute=1" : ""}`;
  return url;
}

/** A local uploaded file (e.g. /casestudies/foo.mov) plays natively, not via iframe embed. */
export const isLocalVideoFile = (src: string) => src.startsWith("/") && /\.(mp4|mov|webm|m4v)$/i.test(src);

export function VideoPlayer({
  src,
  title,
  muted,
  className = "size-full object-contain",
}: {
  src: string;
  title?: string;
  muted?: boolean;
  className?: string;
}) {
  if (isLocalVideoFile(src)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={src} muted={muted} controls playsInline className={className} />
    );
  }
  return (
    <iframe
      src={embedSrc(src, muted)}
      className={className}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      title={title ?? "Video"}
    />
  );
}

function Browser({
  label,
  stripe,
  border,
}: {
  label: string;
  stripe: string;
  border: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-[var(--rmock)] bg-[#0c0b0f]"
      style={{ border: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-[6px] border-b border-[#18181f] px-[14px] py-[11px]">
        <span className="size-[9px] rounded-full bg-[#2c2c33]" />
        <span className="size-[9px] rounded-full bg-[#2c2c33]" />
        <span className="size-[9px] rounded-full bg-[#2c2c33]" />
      </div>
      <div
        className="flex h-[340px] items-center justify-center font-mono text-[11px] text-faint"
        style={{ background: stripe }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── one section ─────────────────────────────────────────────── */

type Ctx = { accent: string; buttonBg: string; stripe: string; border: string };

function Section({ s, ctx }: { s: CaseStudySection; ctx: Ctx }) {
  switch (s.type) {
    case "stats":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          {s.items.map((it) => {
            const t = it.tone ? toneOf(it.tone) : null;
            return (
              <div
                key={it.label}
                className={`rounded-[var(--rcard)] p-7 ${
                  t ? "" : "border border-line bg-panel"
                }`}
                style={
                  t ? { background: t.bg, border: `1px solid ${t.border}` } : undefined
                }
              >
                <div
                  className="font-display text-[clamp(34px,6vw,52px)] font-semibold leading-none"
                  style={{ color: t ? t.text : ctx.accent }}
                >
                  {it.value}
                </div>
                <div className="mt-3 text-sm text-text">{it.label}</div>
                {it.sub && (
                  <div className="mt-1 font-mono text-[11px] text-dim">
                    {it.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );

    case "prose":
      return (
        <div className="grid gap-x-12 gap-y-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeader
              num={s.num}
              eyebrow={s.eyebrow}
              title={s.title}
              subhead={s.subtitle}
              accent={ctx.accent}
            />
            <div className="flex max-w-[560px] flex-col gap-4 text-[17px] leading-[1.7] text-[#a6a6af]">
              {s.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          {s.notes && (
            <div className="flex flex-col gap-3 md:pt-2">
              {s.notes.map((n) => (
                <div
                  key={n.title}
                  className="rounded-[14px] border border-line bg-panel p-5"
                >
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                    {n.title}
                  </div>
                  <div className="mt-2 text-[14.5px] leading-[1.55] text-muted">
                    {n.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "quote":
      return (
        <figure
          className="rounded-[var(--rcard)] border-l-2 bg-panel px-8 py-9 sm:px-12 sm:py-12"
          style={{ borderLeftColor: ctx.accent }}
        >
          <blockquote className="font-display text-[clamp(22px,4vw,32px)] font-medium leading-[1.32] text-[#dcdce2]">
            “{s.text}”
          </blockquote>
          {s.cite && (
            <figcaption className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
              — {s.cite}
            </figcaption>
          )}
        </figure>
      );

    case "features":
      return (
        <div>
          <SectionHeader title={s.title} intro={s.intro} accent={ctx.accent} />
          {s.mockLabel && (
            <div className="mb-6">
              <Browser
                label={s.mockLabel}
                stripe={ctx.stripe}
                border={ctx.border}
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {s.items.map((it) => {
              const t = toneOf(it.tone);
              return (
                <div
                  key={it.title}
                  className="rounded-[var(--rcard)] p-6"
                  style={{ background: t.bg, border: `1px solid ${t.border}` }}
                >
                  <div
                    className="font-mono text-[10.5px] uppercase tracking-[0.1em]"
                    style={{ color: t.text }}
                  >
                    {it.eyebrow}
                  </div>
                  <h3 className="mt-2 font-display text-[21px] font-semibold leading-[1.15] text-text-strong">
                    {it.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">
                    {it.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "compare":
      return (
        <div>
          <SectionHeader title={s.title} intro={s.intro} accent={ctx.accent} />
          <div className="grid gap-4 md:grid-cols-2">
            {s.columns.map((col) => {
              const t = toneOf(col.tone);
              return (
                <div
                  key={col.title}
                  className="rounded-[var(--rcard)] p-7"
                  style={{ background: t.bg, border: `1px solid ${t.border}` }}
                >
                  <h3
                    className="font-display text-[20px] font-semibold"
                    style={{ color: t.text }}
                  >
                    {col.title}
                  </h3>
                  <ul className="mt-5 flex flex-col gap-3">
                    {col.points.map((p) => (
                      <li
                        key={p}
                        className="flex gap-3 text-[15px] leading-[1.5] text-muted"
                      >
                        <span style={{ color: t.text }}>—</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "metrics":
      return (
        <div>
          {(s.title || s.intro) && (
            <SectionHeader
              title={s.title ?? ""}
              intro={s.intro}
              accent={ctx.accent}
            />
          )}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--rcard)] border border-line bg-line sm:grid-cols-4">
            {s.items.map((it) => (
              <div key={it.label} className="bg-panel p-6">
                <div
                  className="font-display text-[34px] font-semibold leading-none"
                  style={{ color: ctx.accent }}
                >
                  {it.value}
                </div>
                <div className="mt-3 text-[13px] leading-[1.4] text-muted">
                  {it.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "beforeAfter":
      return (
        <div>
          <SectionHeader title={s.title} accent={ctx.accent} />
          <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div className="flex max-w-[440px] flex-col gap-4 text-[16px] leading-[1.7] text-[#a6a6af]">
              {s.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div>
              <Browser
                label={s.mockLabel}
                stripe={ctx.stripe}
                border={ctx.border}
              />
              {s.caption && (
                <p className="mt-3 text-center font-mono text-[11px] text-dim">
                  {s.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      );

    case "table":
      return (
        <div>
          <SectionHeader title={s.title} intro={s.intro} accent={ctx.accent} />
          <div className="overflow-x-auto rounded-[var(--rcard)] border border-line">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-panel">
                  {s.headers.map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-4 font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim ${
                        i === 0 ? "" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.rows.map((row, r) => (
                  <tr key={r} className="border-b border-line-soft last:border-0">
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`px-5 py-4 text-[14.5px] ${
                          c === 0
                            ? "text-muted"
                            : "text-right font-mono text-text"
                        } ${c === row.length - 1 ? "font-semibold" : ""}`}
                        style={
                          c === row.length - 1 ? { color: ctx.accent } : undefined
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "lessons":
      return (
        <div>
          <SectionHeader title={s.title} accent={ctx.accent} />
          <div className="grid gap-4 md:grid-cols-2">
            {s.items.map((it) => (
              <div
                key={it.title}
                className="rounded-[var(--rcard)] border border-line bg-panel p-7"
              >
                <h3 className="font-display text-[22px] font-semibold leading-[1.15]">
                  {it.title}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-muted">
                  {it.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case "cards":
      return (
        <div>
          <SectionHeader title={s.title} intro={s.intro} accent={ctx.accent} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {s.items.map((it) => (
              <div
                key={it.title}
                className="rounded-[16px] border border-line bg-panel p-6"
              >
                {it.eyebrow && (
                  <div
                    className="font-mono text-[10.5px] uppercase tracking-[0.1em]"
                    style={{ color: ctx.accent }}
                  >
                    {it.eyebrow}
                  </div>
                )}
                <h3 className="mt-2 font-display text-[18px] font-semibold leading-[1.2]">
                  {it.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-muted-2">
                  {it.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case "metaRow":
      return (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--rcard)] border border-line bg-line md:grid-cols-4">
          {s.items.map((it) => (
            <div key={it.label} className="bg-panel p-6">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim">
                {it.label}
              </div>
              <div className="mt-2 text-[14.5px] leading-[1.5] text-text">
                {it.value}
              </div>
            </div>
          ))}
        </div>
      );

    case "tags":
      return (
        <div className="flex flex-wrap gap-2">
          {s.items.map((t) => (
            <span
              key={t}
              className="rounded-full border border-[#2a2a30] px-[13px] py-[7px] font-mono text-[11px] uppercase tracking-[0.08em] text-muted-2"
            >
              {t}
            </span>
          ))}
        </div>
      );

    case "microCards":
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.items.map((it) => (
            <div
              key={it.label}
              className="rounded-[16px] border border-line bg-panel p-6"
            >
              <div
                className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
                style={{ color: ctx.accent }}
              >
                {it.label}
              </div>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-muted">
                {it.text}
              </p>
            </div>
          ))}
        </div>
      );

    case "findings":
      return (
        <div>
          {(s.title || s.subhead) && (
            <SectionHeader
              title={s.title ?? ""}
              subhead={s.subhead}
              accent={ctx.accent}
            />
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {s.items.map((it) => {
              const t = toneOf(it.tone);
              return (
                <div
                  key={it.title}
                  className="rounded-[var(--rcard)] p-7"
                  style={{ background: t.bg, border: `1px solid ${t.border}` }}
                >
                  <h3
                    className="font-mono text-[12px] uppercase tracking-[0.1em]"
                    style={{ color: t.text }}
                  >
                    {it.title}
                  </h3>
                  <p className="mt-3 text-[14.5px] leading-[1.6] text-muted">
                    {it.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "modules":
      return (
        <div>
          {(s.title || s.subhead) && (
            <SectionHeader
              title={s.title ?? ""}
              subhead={s.subhead}
              accent={ctx.accent}
            />
          )}
          <div className="grid gap-5 md:grid-cols-3">
            {s.items.map((it) => {
              const t = toneOf(it.tone);
              return (
                <div
                  key={it.title}
                  className="flex flex-col overflow-hidden rounded-[var(--rcard)]"
                  style={{ background: t.bg, border: `1px solid ${t.border}` }}
                >
                  {it.videoUrl ? (
                    <div className="aspect-video w-full bg-black">
                      <VideoPlayer src={it.videoUrl} title={it.title} muted={it.muted} />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-black/40 font-mono text-[11px] text-faint">
                      [ video ]
                    </div>
                  )}
                  <div className="p-6">
                    <h3
                      className="font-display text-[19px] font-semibold leading-[1.2]"
                      style={{ color: t.text }}
                    >
                      {it.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-muted">
                      {it.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "media": {
      const caption = s.caption && (
        <p className="mt-3 text-center font-mono text-[11px] text-dim">
          {s.caption}
        </p>
      );
      if (s.kind === "video") {
        return (
          <figure>
            {s.src ? (
              <div
                className={
                  isLocalVideoFile(s.src)
                    ? "w-full overflow-hidden rounded-[var(--rmock)] border border-line bg-black"
                    : "aspect-video w-full overflow-hidden rounded-[var(--rmock)] border border-line bg-black"
                }
              >
                <VideoPlayer
                  src={s.src}
                  title={s.caption ?? "Video"}
                  muted={s.muted}
                  className={isLocalVideoFile(s.src) ? "block w-full h-auto" : "size-full"}
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-[var(--rmock)] border border-dashed border-line bg-panel font-mono text-[12px] text-faint">
                {s.label ?? "[ VIDEO ]"}
              </div>
            )}
            {caption}
          </figure>
        );
      }
      return (
        <figure>
          {s.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.src}
              alt={s.caption ?? ""}
              className="w-full rounded-[var(--rmock)] border border-line"
            />
          ) : (
            <div className="flex h-[clamp(220px,34vw,420px)] w-full items-center justify-center rounded-[var(--rmock)] border border-dashed border-line bg-panel font-mono text-[12px] text-faint">
              {s.label ?? "[ IMAGE ]"}
            </div>
          )}
          {caption}
        </figure>
      );
    }
  }
}

export default function CaseStudySections({
  sections,
  ctx,
}: {
  sections: CaseStudySection[];
  ctx: Ctx;
}) {
  return (
    <div className="flex flex-col gap-20 sm:gap-24">
      {sections.map((s, i) => (
        <Section key={`${s.type}-${i}`} s={s} ctx={ctx} />
      ))}
    </div>
  );
}
