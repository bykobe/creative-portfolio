"use client";

import ButtonLink from "../ui/ButtonLink";
import ClipText from "../ui/ClipText";
import ScrollBackground from "../ui/ScrollBackground";

import styles from "./ImpressiveMoments.module.css";

export default function ImpressiveMoments() {

  return (
    <section className={styles.im_wrapper} id="impressive-moments">
      <ScrollBackground targetId="impressive-moments" at={0.4} />
      <div className={styles.im_body}>
        <div className={styles.im_content}>
          <span className={`paragraph4 ${styles.im_caption}`}>Mildly Impressive Facts</span>
          <span style={{fontStyle: "italic"}} className={`paragraph4 ${styles.im_key}`}>(01)</span>

          <div className={styles.im_desc_wrapper}>

              <ClipText className={`paragraph1 ${styles.im_desc}`} as="p" on="scroll" ease="power1.inOut">
                I&apos;ve always been a creative. Even as a kid I used to enjoying drawing and also messing with technology.
                It got me into a lot of trouble but I think it&apos;s part of who I am meant to be.
                I come from a family of creatives so I guess it runs in the blood,
                my grandma was an artist so that&apos;s where I get my artsy skills from.
              </ClipText>
            <ButtonLink href="/my-journey" className={styles.im_btn}>
              Read more
              </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
