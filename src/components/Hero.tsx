import { getProfile, getCaseStudies, getHeroStats } from "@/lib/data";
import ChatTeaser from "./ChatTeaser";

export default function Hero() {
  const profile = getProfile();
  const stats = getHeroStats();
  const projects = getCaseStudies()
    .slice(0, 3)
    .map((c) => ({
      slug: c.slug,
      code: c.code,
      title: c.title,
      category: c.category,
      accent: c.accent,
      badgeBg: c.badgeBg,
    }));

  // First two sentences of the bio make the hero intro.
  const intro = profile.bio.split(/(?<=\.)\s+/).slice(0, 2).join(" ");

  return (
    <section className="py-[64px]">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(360px,420px)]">
        {/* left: intro */}
        <div data-reveal-group data-reveal-step="110">
          <div
            className="mb-[26px] font-mono text-xs uppercase tracking-[0.16em] text-[#7a7a85]"
            data-reveal="fade"
          >
            {profile.role} · AI &amp; Enterprise
          </div>
          <h1
            className="font-display text-[clamp(40px,6.5vw,72px)] font-semibold leading-[1.0] tracking-[-0.02em]"
            data-reveal="mask"
          >
            Crafting interfaces
            <br />
            for <span className="italic text-accent">complex products.</span>
          </h1>
          <p
            className="mt-7 max-w-[560px] text-[17px] leading-[1.55] text-muted"
            data-reveal="up"
          >
            {intro}
          </p>
          {stats.length > 0 && (
            <dl
              className="mt-9 flex flex-wrap items-start gap-x-12 gap-y-6"
              data-reveal="up"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-display text-[clamp(34px,5vw,46px)] font-semibold leading-none tracking-[-0.02em] text-accent">
                    {stat.value}
                    {stat.plus && "+"}
                  </dt>
                  <dd className="mt-[10px] font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted-2">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* right: chatbot teaser */}
        <ChatTeaser profile={profile} projects={projects} />
      </div>
    </section>
  );
}
