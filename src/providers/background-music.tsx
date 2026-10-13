"use client";
// src/providers/background-music.tsx
//
// Site-wide background music. It starts the moment the site loads: the track is asked to play
// audibly on mount and, if the browser blocks that (autoplay policy), it starts playing muted
// right away and turns the sound on at the first interaction. The mute preference is remembered
// in localStorage.
//
// A component that plays its own audio (e.g. a Spotify embed in the Music Taste section) can call
// useBackgroundMusic().pause() to step aside, then resume() to bring the track back.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Point this at your track in /public/audio/.
const TRACK_SRC = "/audio/background-music.mp3";
const TRACK_VOLUME = 0.3;
const MUTED_KEY = "background-music-muted";

type BackgroundMusicValue = {
  muted: boolean;
  playing: boolean;
  /** Mute or unmute. Unmuting also starts playback. */
  toggle: () => void;
  /** Stop for an external player (e.g. a video or Spotify embed). */
  pause: () => void;
  /** Start again, unless the user has muted the music. */
  resume: () => void;
};

const BackgroundMusicContext = createContext<BackgroundMusicValue | null>(null);

export function useBackgroundMusic() {
  const value = useContext(BackgroundMusicContext);
  if (!value) throw new Error("useBackgroundMusic must be used inside <BackgroundMusic>");
  return value;
}

export default function BackgroundMusic({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  // true while the track plays muted because audible autoplay was blocked; a gesture un-mutes it
  const [blocked, setBlocked] = useState(false);
  const mutedRef = useRef(false);
  const externalPauseRef = useRef(false);

  const playAudibly = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio
      .play()
      .then(() => {
        setPlaying(true);
        setBlocked(false);
      })
      .catch(() => {
        // Audible autoplay blocked: play muted (always allowed) and un-mute at the first gesture
        audio.muted = true;
        audio
          .play()
          .then(() => {
            setPlaying(true);
            setBlocked(true);
          })
          .catch(() => {});
      });
  }, []);

  // Start on load, honouring the saved preference.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = TRACK_VOLUME;

    let stored = false;
    try {
      stored = window.localStorage.getItem(MUTED_KEY) === "true";
    } catch {
      // no storage (private mode): default to sound on
    }
    mutedRef.current = stored;
    setMuted(stored);
    audio.muted = stored;
    if (!stored) playAudibly();
  }, [playAudibly]);

  // If the browser blocked autoplay, the first interaction turns the sound on. Gestures on the
  // music button itself are ignored: its own click handler already starts the music.
  useEffect(() => {
    if (externalPauseRef.current) return;
    if (muted || (playing && !blocked)) return;
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const onGesture = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-music-toggle]")) return;
      if (mutedRef.current || externalPauseRef.current) return;
      playAudibly();
    };
    for (const event of events) window.addEventListener(event, onGesture, { capture: true });
    return () => {
      for (const event of events) window.removeEventListener(event, onGesture, { capture: true });
    };
  }, [muted, playing, blocked, playAudibly]);

  const toggle = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;
      mutedRef.current = next;
      const audio = audioRef.current;
      if (audio) {
        audio.muted = next;
        if (next) {
          setPlaying(false);
          setBlocked(false);
        } else {
          playAudibly();
        }
      }
      try {
        window.localStorage.setItem(MUTED_KEY, String(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, [playAudibly]);

  const pause = useCallback(() => {
    externalPauseRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    setBlocked(false);
  }, []);

  const resume = useCallback(() => {
    externalPauseRef.current = false;
    if (!mutedRef.current) playAudibly();
  }, [playAudibly]);

  return (
    <BackgroundMusicContext.Provider value={{ muted, playing, toggle, pause, resume }}>
      <audio ref={audioRef} src={TRACK_SRC} loop preload="auto" aria-hidden="true" />
      {children}
    </BackgroundMusicContext.Provider>
  );
}
