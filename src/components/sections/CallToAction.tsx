import styles from "./CallToAction.module.css";
import CTA from "../ui/CallToAction";
import ButtonLink from "../ui/ButtonLink";

// 18 green bars sit on 35 equal columns (bar, gap, bar, gap, ...). The outer two bars on each side
// run the full height; the 14 in between are only a cap at the top and a cap at the bottom.
const BARS = 18;
const FULL_BARS = 2; // per side

export default function CallToAction() {
  return (
    <>
      <section className={styles.cta_wrapper}>
        <div className={styles.cta_bg} aria-hidden="true">
          {Array.from({ length: BARS }, (_, i) => {
            const full = i < FULL_BARS || i >= BARS - FULL_BARS;
            return (
              <span
                key={i}
                className={full ? styles.cta_bar_full : styles.cta_bar_cap}
                style={{ gridColumn: i * 2 + 1 }}
              />
            );
          })}
        </div>
        <ButtonLink className={styles.cta_link} href="/">
          <CTA />
        </ButtonLink>
      </section>
      <div className={styles.cta_dsn_wrapper}></div>
    </>
  );
}
