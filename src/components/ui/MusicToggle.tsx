"use client";

import { useBackgroundMusic } from "@/providers/background-music";
import styles from "../components.module.css";
import HeadphonesSVG from "./svgs/Headphones";
import NoSoundSVG from "./svgs/NoSound";

export default function MusicToggle() {

  const { muted, toggle } = useBackgroundMusic();

  return (
    <button
      type="button"
      onClick={toggle}
      data-music-toggle=""
      aria-pressed={!muted}
      aria-label={muted ? "Unmute background music" : "Mute background music"}
      className={styles.musicToggle}
    >
      {muted ? <NoSoundSVG /> : <HeadphonesSVG />}
    </button>
  );
}
