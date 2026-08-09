"use client";

import { useMusic } from "./MusicProvider";

/**
 * Floating playback indicator. Sits directly above the "Ask AI" launcher
 * (which is fixed at bottom-6 right-6) and only appears once a visitor has
 * actually started the track.
 */
export default function MusicToggle() {
  const { active, playing, toggle, stop } = useMusic();
  if (!active) return null;

  return (
    <div className="fixed bottom-[84px] right-6 z-50 flex items-center gap-1 rounded-full border border-[#2c2c33] bg-black/90 py-2 pl-3 pr-2 shadow-[0_20px_55px_-20px_rgba(0,0,0,0.8)] backdrop-blur">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Resume music"}
        className="flex items-center gap-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-70"
      >
        {/* three-bar equaliser — animates only while playing */}
        <span aria-hidden className="flex h-[13px] items-end gap-[2px]">
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
                  : { height: "35%" }
              }
            />
          ))}
        </span>
        {playing ? "Pause" : "Play"}
      </button>
      <span aria-hidden className="mx-1 h-4 w-px bg-[#2c2c33]" />
      <button
        type="button"
        onClick={stop}
        aria-label="Turn off music"
        className="flex size-6 items-center justify-center rounded-full text-[15px] leading-none text-dim transition-colors hover:bg-white/10 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
