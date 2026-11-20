"use client";

import { case_studies } from "../ui/assets";
import styles from "./Projects.module.css";
import ButtonLink from "../ui/ButtonLink";
import { PixelMedia } from "../pixel-media/pixel-media";

export default function Projects() {
  return (
    <section className={styles.projectsWrapper}>
      <div className={styles.projectsBody}>
        {/* five tiles: the layout has five slots (two on top, two below, one full-width) */}
        {case_studies.slice(0, 5).map(({ img, title, alt }, idx) => (
          <article className={styles.projectItem} key={title}>
            <div className={styles.pi_img_wrapper}>
              <PixelMedia
                type="image"
                src={img}
                alt={alt || title}
                greyscale={true}
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
            View all Projects
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
