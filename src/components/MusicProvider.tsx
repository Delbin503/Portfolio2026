"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Site-wide background track. Mounted once in the root layout so playback
 * survives scrolling and client-side route changes.
 *
 * Source is a hidden YouTube IFrame player. To swap to a self-hosted file
 * instead, replace the player plumbing below with an <audio> element — the
 * context surface (playing / progress / toggle / stop) stays the same.
 *
 * Seeking is deliberately not exposed: callers can only play, pause, or stop
 * back to the start.
 */
const VIDEO_ID = "QCumKFu0PYY";
const API_SRC = "https://www.youtube.com/iframe_api";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};
type YTEvent = { target: YTPlayer; data: number };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: YTEvent) => void;
        onStateChange?: (e: YTEvent) => void;
        onError?: (e: YTEvent) => void;
      };
    }
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Load the IFrame API once, lazily — nothing is fetched until first play. */
let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YT namespace missing"));
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = API_SRC;
      s.async = true;
      s.onerror = () => reject(new Error("iframe_api blocked"));
      document.head.appendChild(s);
    }
    // Blocked by an extension / offline — don't hang the UI forever.
    setTimeout(() => reject(new Error("iframe_api timeout")), 8000);
  }).catch((e) => {
    apiPromise = null; // allow a retry on the next click
    throw e;
  });
  return apiPromise;
}

type MusicCtx = {
  /** true once the visitor has started the track at least once */
  active: boolean;
  playing: boolean;
  /** 0–1, for the waveform only — not seekable */
  progress: number;
  loading: boolean;
  failed: boolean;
  toggle: () => void;
  stop: () => void;
};

const Ctx = createContext<MusicCtx | null>(null);

export function useMusic(): MusicCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMusic must be used inside <MusicProvider>");
  return ctx;
}

export default function MusicProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Poll position while playing — the waveform reads this.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const d = p.getDuration();
      if (d > 0) setProgress(Math.min(1, p.getCurrentTime() / d));
    }, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (p) {
      if (playing) p.pauseVideo();
      else p.playVideo();
      return;
    }
    if (loading || !hostRef.current) return;
    setLoading(true);
    setFailed(false);
    loadApi()
      .then((YT) => {
        if (!hostRef.current) return;
        playerRef.current = new YT.Player(hostRef.current, {
          videoId: VIDEO_ID,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (e) => {
              setLoading(false);
              setActive(true);
              e.target.playVideo();
            },
            onStateChange: (e) => {
              if (e.data === 1) setPlaying(true);
              else if (e.data === 2) setPlaying(false);
              else if (e.data === 0) {
                setPlaying(false);
                setProgress(0);
              }
            },
            onError: () => {
              setLoading(false);
              setFailed(true);
            },
          },
        });
      })
      .catch(() => {
        setLoading(false);
        setFailed(true);
      });
  }, [playing, loading]);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
    setPlaying(false);
    setProgress(0);
    setActive(false);
  }, []);

  return (
    <Ctx.Provider
      value={{ active, playing, progress, loading, failed, toggle, stop }}
    >
      {children}
      {/* Audio-only: the player is present but visually collapsed. */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 -z-10 size-px overflow-hidden opacity-0"
      >
        <div ref={hostRef} />
      </div>
    </Ctx.Provider>
  );
}
