import styles from "./cs.module.css";
import ButtonLink from "@/components/ui/ButtonLink";
import { case_studies } from "@/components/ui/assets";
import CallToAction from "@/components/sections/CallToAction";
import ClipText from "@/components/ui/ClipText";
import { PixelMedia } from "@/components/pixel-media/pixel-media";

export default function Projects() {
  return (
    <section className={styles.cs_wrapper}>
      <div className={styles.cs_body}>

        <div className={styles.cs_hero}>
          <div className={styles.cs_hero_title}>
            <ClipText as={`h1`} on="load" ease="power1.inOut" delay={0.5} className="heading1">Portfolio</ClipText>
            <ClipText as={`sup`} on="load" delay={0.7} ease="power1.inOut" className={`heading2`}>05</ClipText>
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
                <ClipText on="scroll" start="top 80%" ease="ease" className={`paragraph4 ${ styles.cs_item_desc} `}>{desc}</ClipText>
              <ButtonLink className={styles.cs_item_link} href={link}>
                 View case study
                </ButtonLink>
              </div>
            </div>

            <div className={styles.cs_item_img}>
              <PixelMedia
                type="image"
                src={img}
                alt={alt ?? title ?? "Case study preview"}
                sizes="(min-width: 1280px) 75vw, 100vw"
              />
            </div>
          </article>
        ))}

        <CallToAction />
      </div>
    </section>
  );
}
