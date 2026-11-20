"use client";

import { PixelMedia } from "../pixel-media/pixel-media";
import { showreel } from "../ui/assets";
import styles from "./Showreel.module.css";

export default function Showreel() {

  return (
    <section className={styles.showreelWrapper}>
      <div className={styles.showreelBody}>
        <PixelMedia type="video" greyscale={false} src={showreel} autoPlay muted loop controls={false} />
      </div>
    </section>
  );
}
