"use client";

import { useEffect, useRef } from "react";
import { experience, music, wonky2 } from "@/components/ui/assets";
import styles from "./about.module.css";
import Image from "next/image";
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import CTA from "@/components/ui/CallToAction";

// Register Draggable (InertiaPlugin is recommended if using GSAP Club for flick-drag)
gsap.registerPlugin(Draggable);
gsap.registerPlugin(InertiaPlugin);

export default function MyJourney() {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!galleryRef.current) return;

    const items: HTMLElement[] = gsap.utils.toArray(galleryRef.current.children);
    if (!items.length) return;

    const itemWidth = items[0].offsetWidth;
    const totalWidth = itemWidth * items.length;

    // Wrap function to create endless loop while dragging
    const wrapX = gsap.utils.wrap(-itemWidth, totalWidth - itemWidth);

    // Apply modifier function to keep items wrapping infinitely
    const updatePosition = function (this: Draggable) {
      gsap.set(items, {
        x: (i) => wrapX(this.x + i * itemWidth),
      });
    };

    // Initialize item positions across the row
    gsap.set(items, {
      x: (i) => i * itemWidth,
      ease: "power1.inOut"
    });

    const [draggable] = Draggable.create(document.createElement("div"), {
      type: "x",
      trigger: galleryRef.current,
      inertia: {x: 300, resistance: 100}, // Enables smooth momentum on drag release (requires GSAP InertiaPlugin if available)
      onDrag: updatePosition,
      onThrowUpdate: updatePosition,
      cursor: "/svg/drag_resized.svg"
    });

    return () => {
      draggable?.kill();
    };
  }, []);

  return (
    <>
    <div className={styles.about_wrapper}>
      <div className={styles.about_body}>
        <div className={styles.about_hero}>
          <div className={styles.about_hero_title}>
            <h1 className="heading1">About me</h1>
          </div>
        </div>
        <div className={styles.about_content}>
          <article className={styles.about_intro}>
            <div className={styles.about_bio_tag}>
              <span className="paragraph4">Biography</span>
            </div>
            <div className={styles.about_bio_info}>
              <span className="paragraph4" style={{ fontStyle: "italic" }}>(i)</span>
            </div>

            <div className={styles.about_bio_body}>
              <p className="paragraph1">
                Hi, I&apos;m Kobe Tio. I love making work that&apos;s as fun to look at as it is to scroll past twice.
                I believe in design with fingerprints—wonky edges, saturated chaos, and unexpected texture.
                My world is built with layered type, tangled color palettes, and layouts that like to interrupt themselves.
              </p>
              <p className="paragraph1">
                I play in the space between order and glitch—where things loop, blur, and burst.
                Sometimes it&apos;s brand identity, sometimes editorial, sometimes just a visual dare.
                Whether it&apos;s a name tag or a system aesthetic, I like making things that smile back at you.
              </p>
            </div>
          </article>

          <div className={styles.about_exp_wrapper}>
            <h1 className={`heading2 ${styles.about_exp_title}`}>Experience</h1>
            <div className={styles.about_exp_table}>
              <div className={styles.about_exp_tb}>
                <div className={styles.about_exp_tb_1}>
                  <span className={`label ${styles.table_title}`}>Studio</span>
                </div>
                <div className={styles.about_exp_tb_2}>
                  <span className={`label ${styles.table_title}`}>Role</span>
                </div>
                <div className={styles.about_exp_tb_3}>
                  <span className={`label ${styles.table_title}`}>Years</span>
                </div>
              </div>
              <div className={styles.about_exp_tc}>
                {experience.map(({ studio, role, years }, idx) => (
                  <div className={styles.about_exp_iw} key={idx}>
                    <div className={styles.about_exp_studio}>
                      <span className="paragraph2">{studio}</span>
                    </div>
                    <div className={styles.about_exp_role}>
                      <span className="paragraph2">{role}</span>
                    </div>
                    <div className={styles.about_exp_years}>
                      <span className="paragraph2">{years}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div id="about_music_wrapper" className={styles.about_music_wrapper}>

            <div className={styles.about_music_cont}>
              <div className={styles.about_music_tw}>
                <h1 className={`heading2 ${styles.about_music_title}`}>Music Taste</h1>
              </div>
              <div className={styles.about_music_iw}>
                <div className={styles.about_info_tag}>
                  <span style={{ fontStyle: "italic" }} className="paragraph4">(i)</span>
                </div>
                <div className={styles.about_music_dw}>
                  <p className={`paragraph2 ${styles.about_music_desc}`}>
                    Another thing about myself is that I am a music lover. I don’t have a specific taste for music, I just enjoy the art and beauty in music. These are my top 3 for now, I really mess with these. If you catch me wearing Headphones, 9 times out of 10, I am listening to music.
                  </p>
                </div>
              </div>
            </div>

            <div ref={galleryRef} id="music_gallery" className={styles.about_music_gallery}>
              {music.map(({ img, alt }, idx) => (
                <div className={styles.music_wrapper} key={idx}>
                  <Image className={styles.about_music} src={img} alt={alt} width={1000} height={1000} />
                </div>
              ))}
            </div>
            </div>

            <div className={styles.about_cta}>
              <div className={styles.about_cta_title}>
                <CTA />
              </div>
              <Image fill src={wonky2} alt="" className={styles.about_cta_img} />
            </div>
        </div>
      </div>
      </div>
    </>
  );
}
