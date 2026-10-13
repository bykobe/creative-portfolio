"use client";

import ButtonLink from "../ui/ButtonLink";
import styles from "./About.module.css";

export default function About() {

  return (
    <section className={styles.aboutWrapper}>
      <div className={styles.aboutBody}>
        <h1 className={`heading1 ${styles.aboutTitle}`}>About Me</h1>
        <div className={styles.aboutContent}>
          <p className={`paragraph1 ${styles.aboutDesc}`}>
            Hi, I’m Kobe Tio. I make work that’s as fun to look at as it is to scroll past twice.
            I believe in design with fingerprints—wonky edges, saturated chaos, and unexpected texture.
            My world is built with layered type, tangled color palettes, and layouts that like to interrupt themselves.
          </p>
          <ButtonLink
            href="/resume.pdf"
            download
            prefetch={false}
            className={styles.aboutBtn}
        >
            Get my Resume
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
