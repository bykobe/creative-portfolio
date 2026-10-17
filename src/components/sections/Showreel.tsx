"use client";

import { showreel } from "../ui/assets";
import styles from "./Showreel.module.css";

export default function Showreel() {

  return (
    <section className={styles.aboutWrapper}>
      <div className={styles.aboutBody}>
        <video src={showreel} autoPlay muted loop controls={false} />
      </div>
    </section>
  );
}
