import fs from "fs";
import path from "path";

// navLinks lives in lib/nav.ts (client-safe). Re-exported here for convenience.
export { navLinks, type NavLink } from "./nav";

export type Profile = {
  name: string;
  role: string;
  tagline: string;
  location: string;
  email: string;
  availability: string;
  bio: string;
};

const DEFAULT_PROFILE: Profile = {
  name: "Maya Chen",
  role: "Product Designer & Front-end Engineer",
  tagline: "Complex systems, simple surfaces.",
  location: "Remote",
  email: "hello@mayachen.studio",
  availability: "Available Q3 2026",
  bio: "Product designer and front-end engineer.",
};

export type HeroStat = { value: string; plus?: boolean; label: string };

/** Tints used by feature/lesson cards on the case-study detail page. */
export type Tone = "pink" | "amber" | "blue" | "violet" | "green" | "plain";

/**
 * Case-study detail pages are assembled from an ordered list of typed sections.
 * Add or reorder sections per project in content/data.json — the renderer
 * switches on `type`. When a case study has no `detail`, the page synthesizes a
 * sensible default set from its summary fields.
 */
export type CaseStudySection =
  | {
      type: "stats";
      items: { value: string; label: string; sub?: string; tone?: Tone }[];
    }
  | {
      type: "prose";
      num?: string;
      eyebrow?: string;
      title: string;
      subtitle?: string;
      paragraphs: string[];
      notes?: { title: string; text: string }[];
    }
  | { type: "quote"; text: string; cite?: string }
  | {
      type: "features";
      title: string;
      intro?: string;
      mockLabel?: string;
      items: { eyebrow: string; title: string; text: string; tone?: Tone }[];
    }
  | {
      type: "compare";
      title: string;
      intro?: string;
      columns: { title: string; tone?: Tone; points: string[] }[];
    }
  | {
      type: "metrics";
      title?: string;
      intro?: string;
      items: { value: string; label: string }[];
    }
  | {
      type: "beforeAfter";
      title: string;
      paragraphs: string[];
      mockLabel: string;
      caption?: string;
    }
  | {
      type: "table";
      title: string;
      intro?: string;
      headers: string[];
      rows: string[][];
    }
  | {
      type: "lessons";
      title: string;
      items: { title: string; text: string }[];
    }
  | {
      type: "cards";
      title: string;
      intro?: string;
      items: { eyebrow?: string; title: string; text: string }[];
    }
  | { type: "metaRow"; items: { label: string; value: string }[] }
  | { type: "tags"; items: string[] }
  | { type: "microCards"; items: { label: string; text: string }[] }
  | {
      type: "findings";
      title?: string;
      subhead?: string;
      items: { title: string; text: string; tone?: Tone }[];
    }
  | {
      type: "modules";
      title?: string;
      subhead?: string;
      items: { title: string; text: string; videoUrl?: string; muted?: boolean; tone?: Tone }[];
    }
  | {
      type: "media";
      kind: "image" | "video";
      src?: string;
      caption?: string;
      label?: string;
      muted?: boolean;
    };

export type CaseStudyDetail = {
  /** Optional override for the hero summary paragraph on the detail page. */
  summary?: string;
  /** Optional italic subtitle shown under the hero title. */
  subtitle?: string;
  sections: CaseStudySection[];
};

export type CaseStudy = {
  slug: string;
  cmdKey: string;
  code: string;
  category: string;
  kicker: string;
  paletteLabel: string;
  title: string;
  metrics: string;
  blurb: string;
  mockLabel: string;
  accent: string;
  buttonBg: string;
  cardGradient: string;
  cardBorder: string;
  badgeBg: string;
  mockStripe: string;
  /** Uploaded via Notion's Projects "Thumbnail" column; falls back to the striped mock label when absent. */
  thumbnail?: { kind: "image" | "video"; src: string; muted?: boolean };
  detail?: CaseStudyDetail;
};

export type MoreProject = {
  num: string;
  category: string;
  categoryColor: string;
  title: string;
  blurb: string;
};

export type WritingEntry = {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
};

export type ExperienceEntry = {
  period: string;
  company: string;
  location: string;
  role: string;
  tags: string[];
  bullets: string[];
};

export type EducationEntry = {
  degree: string;
  school: string;
  period: string;
};

export type Praise = {
  quote: string;
  name: string;
  title: string;
  gradient: string;
};

/** A hackathon / challenge / program participation shown in the Contributions tab. */
export type Contribution = {
  title: string;
  date: string;
  org: string;
  description: string;
  certificateUrl?: string;
  /** Optional public image URL; falls back to a tinted org tile when absent. */
  image?: string;
  tone?: Tone;
};

export type ContentData = {
  profile?: Profile;
  heroStats: HeroStat[];
  caseStudies: CaseStudy[];
  moreProjects: MoreProject[];
  writing: WritingEntry[];
  experience: ExperienceEntry[];
  volunteering: ExperienceEntry[];
  education: EducationEntry[];
  contributions: Contribution[];
  praise: Praise[];
};

function readContent(): ContentData {
  const filePath = path.join(process.cwd(), "content", "data.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ContentData;
}

export function getContent(): ContentData {
  return readContent();
}

// Named exports for backwards compatibility with existing components
export function getProfile(): Profile {
  return { ...DEFAULT_PROFILE, ...(readContent().profile ?? {}) };
}
export function getHeroStats(): HeroStat[] {
  return readContent().heroStats;
}
export function getCaseStudies(): CaseStudy[] {
  return readContent().caseStudies;
}
export function getCaseStudy(slug: string): CaseStudy | undefined {
  return readContent().caseStudies.find((c) => c.slug === slug);
}
export function getMoreProjects(): MoreProject[] {
  return readContent().moreProjects;
}
export function getWriting(): WritingEntry[] {
  return readContent().writing;
}
export function getExperience(): ExperienceEntry[] {
  return readContent().experience;
}
export function getVolunteering(): ExperienceEntry[] {
  return readContent().volunteering ?? [];
}
export function getEducation(): EducationEntry[] {
  return readContent().education ?? [];
}
export function getContributions(): Contribution[] {
  return readContent().contributions ?? [];
}
export function getPraise(): Praise[] {
  return readContent().praise;
}
