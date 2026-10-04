"use client";

import styles from "./ui.module.css";
import { ASTERISK, E_GLYPH, G_GLYPH, H_GLYPH, K_GLYPH, L_GLYPH, O_GLYPH, R_GLYPH, S_GLYPH, T_GLYPH, W_GLYPH } from "./assets";

const BRAND_COLORS = [
  "var(--lime)",
  "var(--pink)",
  "var(--green)",
  "var(--yellow)",
  "var(--sky-blue)",
  "var(--orange)",
  "var(--blue)",
  "var(--cyan)",
];

export default function CTA() {
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    // Target either the SVG itself or its parent wrapper
    const svg = target.closest("svg");
    if (!svg) return;

    // Pick a random color from the palette
    const randomColor = BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)];
    svg.style.setProperty("--glyph-color", randomColor);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as SVGElement;
    const svg = target.closest("svg");
    if (!svg) return;

    // Reset back to black when leaving (or keep the random color if you prefer!)
    svg.style.setProperty("--glyph-color", "var(--black)");
  };

  return (
    <div
      className={styles.text_wrapper}
      onMouseOver={handleMouseEnter}
      onMouseOut={handleMouseLeave}
    >
      <div className={styles.tw_top}>
        <div className={styles.text_lets}>
          <L_GLYPH />
          <E_GLYPH />
          <T_GLYPH />
          <S_GLYPH />
          <div className={styles.asterisk_container}>
            <ASTERISK />
          </div>
        </div>

        <div className={styles.text_work}>
          <W_GLYPH />
          <O_GLYPH />
          <R_GLYPH />
          <K_GLYPH />
        </div>
      </div>
      <div className={styles.tw_bottom}>
        <div className={styles.text_together}>
          <T_GLYPH />
          <O_GLYPH />
          <G_GLYPH />
          <E_GLYPH />
          <T_GLYPH />
          <H_GLYPH />
          <E_GLYPH />
          <R_GLYPH />
        </div>
      </div>
    </div>
  );
}
