import { style } from "motion/react-m";
import ButtonLink from "../ui/ButtonLink";

import styles from "./ImpressiveMoments.module.css";

export default function ImpressiveMoments() {
  return (
    <section className={styles.im_wrapper}>
      <div className={styles.im_body}>
        <div className={styles.im_content}>
          <span className={`paragraph3 ${styles.im_caption}`}>Mildly Impressive Facts</span>
          <span className={`paragraph3 ${styles.im_key}`}>(01)</span>

          <div className={styles.im_desc_wrapper}>
            <p className={`paragraph1 ${styles.im_desc}`}>
            Along the way: featured on Figma Community, invited to speak at a design thing, and once accidentally made a typeface that looked like pasta. My work has shown up in zines, mockups, sticker-covered laptops, and one Berlin subway ad (true story). Small wins, big joy.
            </p>
            <ButtonLink href="/about-me" className={styles.im_btn}>
              Read more
              </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
