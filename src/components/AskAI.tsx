"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FAQ,
  DEFAULT_FOLLOWUPS,
  matchQuestion,
  type FaqId,
} from "@/lib/chatFaq";

export const OPEN_ASK_AI_EVENT = "open-ask-ai";

// Artificial "thinking" pause before a canned answer appears, so every reply
// feels considered rather than instant. Tweak this one value to taste.
const THINKING_MS = 2500;

type ProjectLink = { label: string; href: string };
type CaseStudyLite = { title: string; slug: string; category: string };

type Msg = {
  role: "user" | "assistant";
  content: string;
  followups?: FaqId[];
  links?: ProjectLink[];
};

/* ── render markdown links + bare emails/URLs as anchors ─────────── */
function autolink(text: string, base: string): ReactNode[] {
  const re = /(https?:\/\/[^\s)]+)|([\w.+-]+@[\w-]+\.[\w.-]+)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(
      <a
        key={`${base}-a${k++}`}
        href={m[2] ? `mailto:${tok}` : tok}
        target="_blank"
        rel="noreferrer"
        className="text-accent underline underline-offset-2"
      >
        {tok}
      </a>
    );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderRich(text: string): ReactNode[] {
  const md = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = md.exec(text))) {
    if (m.index > last) out.push(...autolink(text.slice(last, m.index), `t${k}`));
    out.push(
      <a
        key={`md${k++}`}
        href={m[2]}
        target="_blank"
        rel="noreferrer"
        className="text-accent underline underline-offset-2"
      >
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...autolink(text.slice(last), `t${k}`));
  return out;
}

export default function AskAI({
  name,
  caseStudies,
}: {
  name: string;
  caseStudies: CaseStudyLite[];
}) {
  const firstName = name.split(" ")[0];
  const greeting: Msg = {
    role: "assistant",
    content: `Hi! I'm ${firstName}'s portfolio assistant. Ask me about his background, work, or how to get in touch.`,
    followups: DEFAULT_FOLLOWUPS,
  };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([greeting]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function reset() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setBusy(false);
    setInput("");
    setMessages([greeting]);
  }

  // Show the loading dots for a beat, then reveal a canned answer.
  function deliver(answer: Msg) {
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    timer.current = setTimeout(() => {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = answer;
        return c;
      });
      setBusy(false);
      timer.current = null;
    }, THINKING_MS);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_ASK_AI_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_ASK_AI_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  function projectLinks(kind: "all" | "ai"): ProjectLink[] {
    const list =
      kind === "ai"
        ? caseStudies.filter((c) => /ai|agent/i.test(c.category))
        : caseStudies;
    return list.map((c) => ({ label: c.title, href: `/work/${c.slug}` }));
  }

  // Build the assistant turn for a canned FAQ entry.
  function answerFor(id: FaqId): Msg {
    const e = FAQ[id];
    const msg: Msg = { role: "assistant", content: e.a, followups: e.followups };
    if (e.projects) {
      const links = projectLinks(e.projects);
      if (links.length) msg.links = links;
      else
        msg.content =
          "I'm featuring my AI-focused work soon — in the meantime, tap “Show me his case studies” to see everything.";
    }
    return msg;
  }

  // Chip click → canned answer after a short "thinking" pause.
  function ask(id: FaqId) {
    if (busy) return;
    setMessages((m) => [...m, { role: "user", content: FAQ[id].q }]);
    deliver(answerFor(id));
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);

    // Canned answer first (no API), else Gemini fallback.
    const id = matchQuestion(q);
    if (id) {
      deliver(answerFor(id));
      return;
    }

    setBusy(true);
    const history = [...messages, { role: "user" as const, content: q }];
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "Something went wrong.");
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: err, followups: DEFAULT_FOLLOWUPS };
          return c;
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: acc };
          return c;
        });
      }
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { ...c[c.length - 1], followups: DEFAULT_FOLLOWUPS };
        return c;
      });
    } catch {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = {
          role: "assistant",
          content: "Couldn't reach the assistant. Please try again.",
          followups: DEFAULT_FOLLOWUPS,
        };
        return c;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ask ${firstName}'s AI`}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-[#2c2c33] bg-black/90 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_55px_-20px_rgba(0,0,0,0.8)] backdrop-blur transition-colors hover:bg-[#15151a]"
      >
        <span className="text-accent">✦</span>
        Ask {firstName}&apos;s AI
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-[660px] max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-line bg-panel-2 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3 border-b border-elev px-5 py-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),#5a4aa8)] text-sm font-bold text-white">
                {name.charAt(0)}
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold leading-tight">
                  Ask {firstName}&apos;s AI
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                  Trained on {firstName}&apos;s work
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                aria-label="New chat"
                title="New chat"
                className="rounded-md p-1.5 text-dim transition-colors hover:text-text"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md px-2 py-1 text-dim transition-colors hover:text-text"
              >
                ✕
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((m, i) => (
                <div key={i}>
                  <div
                    className={
                      m.role === "user" ? "flex justify-end" : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[82%] rounded-2xl rounded-br-sm bg-[#1a1a20] px-4 py-2.5 text-[14.5px] text-text"
                          : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-line bg-panel px-4 py-2.5 text-[14.5px] leading-[1.6] text-[#dcdce2]"
                      }
                    >
                      {m.content ? (
                        renderRich(m.content)
                      ) : (
                        <span className="inline-flex gap-1">
                          <Dot /> <Dot /> <Dot />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* project / external links */}
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          className="inline-flex items-center gap-1 rounded-full border border-[#2a2a30] bg-panel px-3 py-1.5 text-[13px] text-text transition-colors hover:border-accent hover:text-accent"
                        >
                          {l.label} <span className="text-accent">→</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* follow-up question chips */}
                  {m.role === "assistant" && m.followups && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {m.followups.slice(0, 4).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => ask(id)}
                          disabled={busy}
                          className="rounded-full border border-[#26262c] px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-[#3a3a44] hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {FAQ[id].q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-elev p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-line bg-panel px-3 py-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={`Ask about ${firstName}…`}
                  className="max-h-28 flex-1 resize-none bg-transparent py-1 text-[14.5px] text-text outline-none placeholder:text-dim"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-[#0a0a0c] transition-opacity disabled:opacity-40"
                  aria-label="Send"
                >
                  ↑
                </button>
              </div>
              <div className="mt-2 px-1 text-center font-mono text-[10px] text-faint">
                Answers are pulled from {firstName}&apos;s portfolio.
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Dot() {
  return <span className="inline-block size-1.5 animate-pulse rounded-full bg-dim" />;
}
