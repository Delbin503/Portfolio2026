// Guided FAQ for the portfolio assistant. Clicking a follow-up chip or asking a
// matching question serves these instantly (no API call). Anything unmatched
// falls back to Gemini. Answers are in Delbin's first-person voice; chip labels
// are the recruiter's question. Links use markdown — the chat UI renders them.

export type FaqId =
  | "about"
  | "experience"
  | "industries"
  | "based"
  | "open"
  | "contact"
  | "skills"
  | "tools"
  | "cases"
  | "aiCases"
  | "process"
  | "duration"
  | "resume";

export type FaqEntry = {
  /** Chip label / canonical question. */
  q: string;
  /** Canned answer (first person, may contain markdown links). */
  a: string;
  /** Up to 4 follow-up question ids shown as chips. */
  followups: FaqId[];
  /** Marks answers whose project links the UI renders dynamically. */
  projects?: "all" | "ai";
};

export const FAQ: Record<FaqId, FaqEntry> = {
  about: {
    q: "Tell me about Delbin",
    a: "I'm Delbin (Toe Htet Arkar), a Product Designer with 4 years of experience turning complex product ideas into intuitive user interfaces. I'm currently open for new opportunities, and I specialize in AI Design & Enterprise solutions.",
    followups: ["experience", "industries", "open", "cases"],
  },
  experience: {
    q: "What's his experience level?",
    a: "I'm a product designer with about 4 years spent building enterprise and AI products. I've worked across synthetic data and computer vision, defense training systems, healthcare, and edtech — usually owning the work from first research through final UI, and caring most about whether it actually moved something for the people using it.",
    followups: ["industries", "skills", "cases", "process"],
  },
  industries: {
    q: "What industries has he worked in?",
    a: "Synthetic data and computer vision, military/defense training systems, healthcare (women's health and nursing), edtech, digital art marketplaces, crypto payments, and many more.",
    followups: ["cases", "aiCases", "process", "skills"],
  },
  based: {
    q: "Where is he based?",
    a: "I'm currently based in Bangkok, Thailand, with extensive remote experience working with teams in Singapore, Indonesia, California, and Myanmar.",
    followups: ["open", "contact", "industries", "cases"],
  },
  open: {
    q: "Is he open to work?",
    a: "I'm currently open to full-time, part-time, contract (3–6 months), and freelance opportunities.",
    followups: ["contact", "resume", "skills", "cases"],
  },
  contact: {
    q: "How can I contact him?",
    a: "You can reach me by email at [delbintoehtet@gmail.com](mailto:delbintoehtet@gmail.com), on [LinkedIn](https://www.linkedin.com/in/toe-htet-arkar-1b0605239/), or via [WhatsApp](https://wa.link/7wkflj).",
    followups: ["resume", "open", "cases"],
  },
  skills: {
    q: "What are his skills?",
    a: "My key skills include Product Design, UX Research, Design Systems, Figma, AI Tools, Rapid Prototyping, User Testing, Design Tokens, and Accessibility.",
    followups: ["tools", "aiCases", "process", "cases"],
  },
  tools: {
    q: "What tools does he use?",
    a: "I use a focused set of tools across the whole project — from design through to shipped code. The ones I work with most: Figma, Codex, Claude, Webflow, Notion, GitHub, Bitbucket, and Framer.",
    followups: ["skills", "process", "cases", "aiCases"],
  },
  cases: {
    q: "Show me his case studies",
    a: "Here are the projects on my portfolio — tap any to open it:",
    followups: ["aiCases", "process", "duration", "tools"],
    projects: "all",
  },
  aiCases: {
    q: "Show me his AI case studies",
    a: "Here's my AI-focused work — tap any to open it:",
    followups: ["cases", "tools", "process", "open"],
    projects: "ai",
  },
  process: {
    q: "What's his design process?",
    a: "My process starts with understanding what users actually need and what the business is trying to achieve, so every solution ends up both useful and intuitive. I work in a structured but flexible way — from early research and ideation through to prototyping and testing in loops.",
    followups: ["duration", "tools", "cases", "skills"],
  },
  duration: {
    q: "How long does a project take?",
    a: "It's always tailored to the scope and complexity of the project. A full product redesign like Terra ran about three months from research through high-fidelity design, while smaller features or single flows move faster.",
    followups: ["process", "cases", "aiCases", "open"],
  },
  resume: {
    q: "Can I see his resume?",
    a: 'Yes — you can view and download my resume [here](https://drive.google.com/file/d/1opS1NsXP-Boy0AMMkkaHGyx6ayuOJ9iD/view).',
    followups: ["contact", "open", "cases", "skills"],
  },
};

export const DEFAULT_FOLLOWUPS: FaqId[] = ["about", "cases", "skills", "open"];

/** Light keyword match so typed questions hit a canned answer when possible. */
export function matchQuestion(text: string): FaqId | null {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  if (has("resume", "cv")) return "resume";
  if (has("contact", "email", "reach", "linkedin", "whatsapp", "get in touch"))
    return "contact";
  if (has("open to", "open for", "available", "hiring", "freelance", "contract"))
    return "open";
  if (has("how long", "timeline", "duration")) return "duration";
  if (has("process", "approach", "method", "workflow")) return "process";
  if (has("tool", "software", "stack")) return "tools";
  if (has("skill", "strength", "good at")) return "skills";
  if (t.includes("ai") && has("case", "project", "work")) return "aiCases";
  if (has("case", "portfolio", "project", "show me his work", "your work"))
    return "cases";
  if (has("experience", "years", "level", "senior")) return "experience";
  if (has("industr", "domain", "sector")) return "industries";
  if (has("based", "located", "location", "where")) return "based";
  if (has("about", "who is", "who are", "tell me about", "yourself"))
    return "about";
  return null;
}
