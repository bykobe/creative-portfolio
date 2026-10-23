"use client";

import { ImageDithering } from '@paper-design/shaders-react';
import { case_studies } from "../ui/assets";
import styles from "./Projects.module.css";
import ButtonLink from "../ui/ButtonLink";
import Image from 'next/image';

export default function Projects() {

  return (
    <section className={styles.projectsWrapper}>
      <div className={styles.projectsBody}>
        {case_studies.slice(0, 4).map(({ img, title, alt }, idx) => (
          <article className={styles.projectItem} key={title}>
            <div className={styles.pi_img_wrapper}>
              {/* Underneath: the dithered version. It fills the box the same way the photo does
                  (cover), so the two line up pixel for pixel. */}
              <ImageDithering
                className={styles.pi_dither}
                width="100%"
                height="100%"
                image={typeof img === "string" ? img : img}
                colorBack="#5452ff"
                colorFront="#ededed"
                colorHighlight="#ededed"
                originalColors
                inverted={false}
                type="2x2"
                size={2}
                colorSteps={1}
                fit="cover"
              />

              {/* On top: the real photo, invisible until the card is hovered, then faded in */}
              <Image
                className={styles.pi_photo}
                src={img}
                alt={alt || title}
                fill
                sizes="(min-width: 1280px) 50vw, (min-width: 700px) 50vw, 100vw"
              />
            </div>
            <div className={styles.pi_cnt_wrapper}>
              <span className="caption">Project {idx + 1}</span>
              <h3 className={`heading5 ${styles.pi_title}`}>{title}</h3>
            </div>
          </article>
        ))}

        <div className={styles.projectsBtnWrapper}>
          <ButtonLink className={styles.projectsBtn} href={"/case-studies"}>
            View all projects
          </ButtonLink>
        </div>
      </div>


    </section>
  );
}
