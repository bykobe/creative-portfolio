import styles from "./cs.module.css";
import Image from "next/image";
import ButtonLink from "@/components/ui/ButtonLink";
import { case_studies, wonky6 } from "@/components/ui/assets";
import CTA from "@/components/ui/CallToAction";
import CallToAction from "@/components/sections/CallToAction";

export default function Projects() {
  return (
    <section className={styles.cs_wrapper}>
      <div className={styles.cs_body}>

        <div className={styles.cs_hero}>
          <div className={styles.cs_hero_title}>
            <h1 className="heading1">Portfolio</h1>
            <sup className={`heading2`}>05</sup>
          </div>
        </div>

        {case_studies.map(({ img, title, link, desc, alt }, idx) => (
          <article className={styles.cs_item} key={title || idx}>
            <div className={styles.cs_item_body}>
              <div className={styles.cs_item_body_ts}>
                <span className="caption">Project {idx + 1}</span>
                <h5 className={`heading5 ${styles.cs_item_title}`}>{title}</h5>
              </div>
              <div className={styles.cs_item_body_bs}>
                <p className={`paragraph4 ${ styles.cs_item_desc} `}>{desc}</p>
              <ButtonLink className={styles.cs_item_link} href={link}>
                 View case study
                </ButtonLink>
              </div>
            </div>

            <div className={styles.cs_item_img}>
              <Image
                src={img}
                alt={alt ?? title ?? "Case study preview"}
                fill
                sizes="(min-width: 1280px) 75vw, 100vw"
                priority={idx === 0}
              />
            </div>
          </article>
        ))}

        <CallToAction />
      </div>
    </section>
  );
}
