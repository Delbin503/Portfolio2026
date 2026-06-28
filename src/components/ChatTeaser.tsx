"use client";

import { OPEN_ASK_AI_EVENT } from "./AskAI";

type Project = {
  slug: string;
  code: string;
  title: string;
  category: string;
  accent: string;
  badgeBg: string;
};

// Deterministic waveform bar heights (no Math.random → no hydration mismatch).
const BARS = Array.from({ length: 40 }, (_, i) =>
  30 + Math.round(Math.abs(Math.sin(i * 0.7) + Math.sin(i * 0.31)) * 34)
);

function openChat() {
  window.dispatchEvent(new Event(OPEN_ASK_AI_EVENT));
}

function jump(slug: string) {
  const el = document.getElementById(`cs-${slug}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ChatTeaser({
  profile,
  projects,
}: {
  profile: { name: string; bio: string };
  projects: Project[];
}) {
  const first = profile.name.split(" ")[0];

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--rcard)] border border-line bg-panel">
      <div className="flex flex-col gap-4 p-5">
        {/* voice note */}
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
            {first} · Intro · Voice note
          </div>
          <button
            type="button"
            onClick={openChat}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#2a2a30] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-text transition-colors hover:border-accent hover:text-accent"
          >
            <span className="text-[8px] text-accent">▶</span> Play Intro
          </button>
        </div>
        <button
          type="button"
          onClick={openChat}
          aria-label={`Open ${first}'s assistant`}
          className="flex items-center gap-4 rounded-[14px] border border-line bg-panel-2 p-3 text-left transition-colors hover:border-[#2e2e36]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] text-[#0a0a0c]">
            ▶
          </span>
          <span className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="w-[2px] shrink-0 rounded-full bg-[#4a4566]"
                style={{ height: `${h}%` }}
              />
            ))}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-dim">0:43</span>
        </button>

        {/* projects */}
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
          Or tap a project —
        </div>
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => jump(p.slug)}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-panel-2 px-4 py-3 text-left transition-colors hover:border-[#2e2e36]"
            >
              <span
                className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] font-mono text-[11px] font-medium"
                style={{ background: p.badgeBg, color: p.accent }}
              >
                {p.code}
              </span>
              <span className="flex-1 truncate text-[14px] text-text">
                {p.title}
              </span>
              <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-dim sm:inline">
                {p.category}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* input → opens the chatbot popup */}
      <div className="flex items-center gap-3 border-t border-elev p-4">
        <button
          type="button"
          onClick={openChat}
          className="flex-1 rounded-full border border-line bg-panel-2 px-4 py-3 text-left text-[14.5px] text-dim transition-colors hover:border-[#2e2e36]"
        >
          Type your question…
        </button>
        <button
          type="button"
          onClick={openChat}
          aria-label="Open assistant"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-accent text-[#0a0a0c] transition-opacity hover:opacity-90"
        >
          →
        </button>
      </div>
    </div>
  );
}
