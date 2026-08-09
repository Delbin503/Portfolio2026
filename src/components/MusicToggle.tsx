"use client";

import { useMusic, fmtTime } from "./MusicProvider";

/**
 * Floating playback control. Sits directly above the "Ask AI" launcher (which
 * is fixed at bottom-6 right-6) and only appears once a visitor has actually
 * started the track. Display only — there is no scrub target, so the track
 * can be paused or stopped but never seeked.
 */
export default function MusicToggle() {
  const { active, playing, current, duration, progress, toggle, stop } =
    useMusic();
  if (!active) return null;

  const ended = !playing && duration > 0 && current === 0;

  return (
    <div className="fixed bottom-[84px] right-6 z-50 select-none overflow-hidden rounded-full border border-[#2c2c33] bg-black/90 shadow-[0_20px_55px_-20px_rgba(0,0,0,0.85)] backdrop-blur">
      <div className="flex items-center gap-2.5 py-2 pl-3.5 pr-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause music" : ended ? "Replay music" : "Resume music"}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-70"
        >
          {/* equaliser — animates only while playing */}
          <span aria-hidden className="flex h-[13px] w-[13px] items-end gap-[2px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-[2.5px] rounded-full bg-accent"
                style={
                  playing
                    ? {
                        height: "100%",
                        animation: `eq 780ms ease-in-out ${i * 160}ms infinite`,
                        transformOrigin: "bottom",
                      }
                    : { height: i === 1 ? "55%" : "32%" }
                }
              />
            ))}
          </span>
          <span className="font-mono text-[11.5px] tabular-nums text-white">
            {fmtTime(current)}
            <span className="text-dim"> / {fmtTime(duration)}</span>
          </span>
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-full bg-white/10 text-[9px] leading-none text-white"
          >
            {playing ? "❚❚" : "▶"}
          </span>
        </button>

        <span aria-hidden className="h-4 w-px bg-[#2c2c33]" />

        <button
          type="button"
          onClick={stop}
          aria-label="Turn off music"
          className="flex size-6 items-center justify-center rounded-full text-[15px] leading-none text-dim transition-colors hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* progress line — indicator only, not a scrub target */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
        <div
          className="h-full bg-accent transition-[width] duration-200 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
