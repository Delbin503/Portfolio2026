import { getProfile, getCaseStudies } from "@/lib/data";
import ChatTeaser from "./ChatTeaser";

export default function Hero() {
  const profile = getProfile();
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
            Complex products,
            <br />
            intuitive <span className="italic text-accent">interfaces.</span>
          </h1>
          <p
            className="mt-7 max-w-[560px] text-[17px] leading-[1.55] text-muted"
            data-reveal="up"
          >
            {intro}
          </p>
        </div>

        {/* right: chatbot teaser */}
        <ChatTeaser profile={profile} projects={projects} />
      </div>
    </section>
  );
}
