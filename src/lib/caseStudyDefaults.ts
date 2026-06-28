import type { CaseStudy, CaseStudySection, Tone } from "./data";

const TONE_CYCLE: Tone[] = ["pink", "amber", "blue", "green"];

/**
 * Builds a complete set of detail sections from a case study's summary fields.
 * Used when content/data.json hasn't authored a bespoke `detail` for a project,
 * so every case-study page renders the full section set rather than a stub.
 */
export function defaultSections(cs: CaseStudy): CaseStudySection[] {
  const metricParts = cs.metrics.split("·").map((p) => p.trim()).filter(Boolean);

  const stats: CaseStudySection = {
    type: "stats",
    items: metricParts.slice(0, 3).map((p) => {
      const m = p.match(/^([\d.+%/x]+\+?)\s*(.*)$/i);
      return m
        ? { value: m[1], label: m[2] || cs.category.toLowerCase() }
        : { value: p, label: cs.category.toLowerCase() };
    }),
  };

  return [
    stats,
    {
      type: "prose",
      eyebrow: "The problem",
      title: "The problem nobody owned.",
      paragraphs: [
        cs.blurb,
        "The pieces existed in different teams and different tools. My first job was to make the whole problem visible in one place before touching a single screen.",
      ],
      notes: [
        { title: "Constraint", text: "Ship inside the existing stack — no rewrites." },
        { title: "Audience", text: "The people living the problem daily, not the buyers." },
        { title: "Bar", text: "Measurably better, not just visibly different." },
      ],
    },
    {
      type: "quote",
      text: "We didn't have a design problem so much as a clarity problem. Once everyone could see the same thing, the right move was obvious.",
      cite: "Project kickoff note",
    },
    {
      type: "features",
      title: "The moves that mattered.",
      intro: "A handful of decisions did most of the work.",
      mockLabel: cs.mockLabel,
      items: [
        { eyebrow: "Clarity", title: "One surface, one truth", text: "Collapsed scattered state into a single, legible view.", tone: "pink" },
        { eyebrow: "Flow", title: "Fewer decisions per step", text: "Removed choices that only existed because the data model demanded them.", tone: "amber" },
        { eyebrow: "Trust", title: "Always explainable", text: "Every automated action left a trail a human could read.", tone: "blue" },
        { eyebrow: "Speed", title: "Fast where it counts", text: "Optimized the moments people actually feel, not the averages.", tone: "green" },
      ],
    },
    {
      type: "metrics",
      title: "The shape of the change.",
      items: metricParts.slice(0, 4).map((p, i) => ({
        value: (p.match(/[\d.+%/x]+\+?/i) || [String((i + 1) * 2)])[0],
        label: p.replace(/[\d.+%/x]+\+?/i, "").trim() || "improved",
      })),
    },
    {
      type: "beforeAfter",
      title: "What changed.",
      paragraphs: [
        "The previous version optimized for the system. The redesign optimized for the person in front of it.",
        "Same capability, far less load — the work moved off the human and into the product.",
      ],
      mockLabel: cs.mockLabel,
      caption: "Before and after, side by side.",
    },
    {
      type: "lessons",
      title: "What this project taught me.",
      items: [
        { title: "Make it visible first", text: "Half the win was getting everyone to see the same problem before proposing a fix." },
        { title: "Ship to learn", text: "The real insights showed up the week after launch — so I planned for that, not against it." },
      ],
    },
    {
      type: "cards",
      title: "If I could go back.",
      items: TONE_CYCLE.map((_, i) => {
        const opts = [
          { eyebrow: "Sooner", title: "Instrument earlier", text: "Baselines are half the story — I'd capture them on day one." },
          { eyebrow: "Wider", title: "Talk to more users", text: "An hour of observation beat a week of assumptions." },
          { eyebrow: "Bolder", title: "Cut more, sooner", text: "I hedged on removing the old path longer than I should have." },
          { eyebrow: "Kinder", title: "Share the demo early", text: "The team living the problem deserved the first look." },
        ];
        return opts[i];
      }),
    },
  ];
}
