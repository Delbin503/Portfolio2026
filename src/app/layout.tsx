import type { Metadata } from "next";
import { Familjen_Grotesk, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AskAI from "@/components/AskAI";
import MusicProvider from "@/components/MusicProvider";
import MusicToggle from "@/components/MusicToggle";
import ScrollReveal from "@/components/ScrollReveal";
import ScrollProgress from "@/components/ScrollProgress";
import { getProfile, getCaseStudies } from "@/lib/data";

const familjen = Familjen_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-familjen",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export function generateMetadata(): Metadata {
  const p = getProfile();
  const title = `${p.name} — ${p.role}`;
  return {
    title: { default: title, template: `%s · ${p.name}` },
    description: p.bio,
    openGraph: { title, description: p.bio, type: "website" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = getProfile();
  const caseStudies = getCaseStudies().map((c) => ({
    title: c.title,
    slug: c.slug,
    category: c.category,
  }));
  return (
    <html
      lang="en"
      className={`${familjen.variable} ${hanken.variable} ${jetbrains.variable}`}
      // the pre-paint script below stamps data-reveal-mode on <html>
      suppressHydrationWarning
    >
      <body>
        {/* Arms the reveal styles before first paint, so nothing flashes in
            visible and then hides. Skipped for reduced motion. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.revealMode="on"}catch(e){}',
          }}
        />
        <ScrollProgress />
        <ScrollReveal />
        <MusicProvider>
          {children}
          <MusicToggle />
          <AskAI name={profile.name} caseStudies={caseStudies} />
        </MusicProvider>
      </body>
    </html>
  );
}
