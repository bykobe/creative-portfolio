"use client";

import { useEffect } from "react";
import { useSound } from "./hooks/useSound";

// Plays the click sound on any press anywhere on the page.
export default function GlobalClickSound() {
  const click = useSound("/audio/mouse-clicks.mp3");

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button > 0) return; // left click / touch / pen only
      click();
    };
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [click]);

  return null;
}
