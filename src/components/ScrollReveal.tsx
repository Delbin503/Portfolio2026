"use client";

import { useEffect } from "react";

/**
 * One observer for the whole document. Anything with `data-reveal="<variant>"`
 * animates in the first time it enters the viewport — no per-item client
 * component, so server components stay server components.
 *
 * Authoring:
 *   data-reveal="up|fade|down|left|right|scale|blur|mask"
 *   data-reveal-group          on a parent → its children stagger
 *   data-reveal-step="90"      stagger step in ms (default 70)
 *   data-reveal-delay="150"    explicit delay in ms, wins over the stagger
 *
 * Variants and the hidden/visible states live in globals.css.
 */

const DEFAULT_STEP = 70;
/** Longest variant duration + slack, after which reveal styling is dropped. */
const SETTLE_MS = 1200;

export default function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Reduced motion (or no IntersectionObserver): leave everything visible.
    if (reduced.matches || typeof IntersectionObserver === "undefined") {
      delete root.dataset.revealMode;
      return;
    }
    root.dataset.revealMode = "on";

    const observed = new WeakSet<Element>();
    const timers = new Set<number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          el.setAttribute("data-revealed", "");

          // Drop the reveal styling once it has settled, so the element's own
          // hover transforms/transitions are no longer overridden.
          const delay = Number(el.dataset.revealSettle ?? 0);
          timers.add(
            window.setTimeout(
              () => el.setAttribute("data-reveal-done", ""),
              SETTLE_MS + delay
            )
          );
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 }
    );

    /** Walk `data-reveal-group` parents and stagger their children. */
    const stagger = () => {
      root.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((group) => {
        const step = Number(group.dataset.revealStep) || DEFAULT_STEP;
        let i = 0;
        for (const child of Array.from(group.children)) {
          const target = child.matches("[data-reveal]")
            ? (child as HTMLElement)
            : child.querySelector<HTMLElement>("[data-reveal]");
          if (!target || target.dataset.revealDelay) continue;
          const delay = i++ * step;
          target.style.setProperty("--reveal-delay", `${delay}ms`);
          target.dataset.revealSettle = String(delay);
        }
      });
    };

    const scan = () => {
      stagger();
      root
        .querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])")
        .forEach((el) => {
          if (observed.has(el)) return;
          observed.add(el);
          if (el.dataset.revealDelay) {
            el.style.setProperty("--reveal-delay", `${el.dataset.revealDelay}ms`);
            el.dataset.revealSettle = el.dataset.revealDelay;
          }
          io.observe(el);
        });
    };

    scan();

    // Content that mounts later (tab switches, modals, streamed sections).
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = window.requestAnimationFrame(() => {
        queued = 0;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      if (queued) cancelAnimationFrame(queued);
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}
