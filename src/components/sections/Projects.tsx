import Image from "next/image";
import { case_studies } from "../ui/assets";
import styles from "./Projects.module.css";
import ButtonLink from "../ui/ButtonLink";

export default function Projects() {
  return (
    <section className={styles.projectsWrapper}>
      <div className={styles.projectsBody}>
        {case_studies.slice(0, 4).map(({ img, title, alt }, idx) => (
          <article className={styles.projectItem} key={title}>
            <div className={styles.pi_img_wrapper}>
              <Image
                src={img}
                alt={alt || title}
                fill
                sizes="(min-width: 1280px) 50vw, 100vw"
                priority={idx === 0}
              />
            </div>
            <div className={styles.pi_cnt_wrapper}>
              <span className="caption">Project {idx + 1}</span>
              <h3 className={`heading5 ${styles.pi_title}`}>{title}</h3>
            </div>
          </article>
        ))}

        <div className={styles.projectsBtnWrapper}>
          <ButtonLink className={styles.projectsBtn} href={""}>View all projects</ButtonLink>
        </div>
      </div>


    </section>
  );
}
