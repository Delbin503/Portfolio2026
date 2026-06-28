"use client";

import { useEffect, useState } from "react";
import { navLinks } from "@/lib/nav";
import { OPEN_ASK_AI_EVENT } from "./AskAI";

const sectionIds = navLinks.map((l) => l.href.replace("#", ""));

export default function Nav({ name }: { name: string }) {
  const first = name.split(" ")[0];
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div className="pointer-events-none sticky top-0 z-[60] flex justify-center px-6 py-[22px]">
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-[#20202a] bg-panel-2 p-2 shadow-[0_20px_55px_-22px_rgba(0,0,0,0.75)]">
        <a
          href="#top"
          className="flex items-center gap-[11px] py-[2px] pl-1 pr-3"
        >
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),#5a4aa8)] text-sm font-bold text-white">
            {name.charAt(0)}
          </span>
          <span className="whitespace-nowrap text-base font-bold tracking-[-0.01em]">
            {name}
          </span>
        </a>

        {navLinks.map((link) => {
          const id = link.href.replace("#", "");
          const isActive = active === id;
          return (
            <a
              key={link.href}
              href={link.href}
              className={`hidden whitespace-nowrap rounded-full px-[15px] py-[9px] text-[15px] font-medium transition-colors hover:bg-[#1a1a20] hover:text-white sm:inline-block ${
                isActive ? "text-white" : "text-[#c9c9d0]"
              }`}
            >
              {link.label}
            </a>
          );
        })}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_ASK_AI_EVENT))}
          className="ml-1 inline-flex items-center gap-[9px] whitespace-nowrap rounded-full border border-[#2c2c33] bg-black px-4 py-[10px] text-[15px] font-semibold text-white transition-colors hover:bg-[#15151a]"
        >
          <span className="text-[15px] text-accent">✦</span>
          <span className="hidden whitespace-nowrap min-[400px]:inline">
            Ask {first}&apos;s AI
          </span>
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </button>
      </nav>
    </div>
  );
}
