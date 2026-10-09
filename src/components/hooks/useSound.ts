// hooks/useSound.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

export function useSound(src: string, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audioRef.current = null;
    };
  }, [src, volume]);

  return useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0; // restart if it's still playing
    audio.play().catch(() => {}); // ignore blocked-playback errors
  }, []);
}
