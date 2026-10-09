"use client";

import { useSound } from "../hooks/useSound";

import ButtonLink from "../ui/ButtonLink";
import ScrollBackground from "../ui/ScrollBackground";

import styles from "./ImpressiveMoments.module.css";

export default function ImpressiveMoments() {

  const click = useSound('/audio/mouse-clicks.mp3');

  return (
    <section className={styles.im_wrapper} id="impressive-moments">
      <ScrollBackground targetId="impressive-moments" at={0.4} />
      <div className={styles.im_body}>
        <div className={styles.im_content}>
          <span className={`paragraph4 ${styles.im_caption}`}>Mildly Impressive Facts</span>
          <span style={{fontStyle: "italic"}} className={`paragraph4 ${styles.im_key}`}>(01)</span>

          <div className={styles.im_desc_wrapper}>
            <p className={`paragraph1 ${styles.im_desc}`}>
            Along the way: featured on Figma Community, invited to speak at a design thing, and once accidentally made a typeface that looked like pasta. My work has shown up in zines, mockups, sticker-covered laptops, and one Berlin subway ad (true story). Small wins, big joy.
            </p>
            <ButtonLink href="/my-journey" onClick={click} className={styles.im_btn}>
              Read more
              </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
