import { PixelMedia } from "../pixel-media/pixel-media"
import PlaygroundMark from "../ui/svgs/PlaygroundMark"
import styles from "./Playground.module.css"
import { playground_banner, showreel } from "../ui/assets"
import Link from "next/link"

// If the asset is imported as an image file it is an object ({ src, width, height }), not a string,
// and PixelMedia needs the plain URL
const bannerSrc =
  typeof playground_banner === "string" ? playground_banner : (playground_banner as { src: string }).src

export default function Playgroud() {
  return (
    <>
      <section className={styles.playground_wrapper}>
        <div className={styles.playground_banner_title}>
          <PlaygroundMark />
        </div>
        <div className={styles.playground_body}>
          <div className={styles.playground_content}>
            <div className={styles.playground_desc_wrapper}>
              <span className={`${styles.playground_desc} paragraph3`}>I create random things that come to mind and leave them here. I guess exploration counts for something right? Basically these are experiments, if you like &apos;em I will be adding more so stay tuned. I think I might just start one of those platforms where they explain the process behind the work for my playground.</span>
              <Link href="/playground" style={{width: "fit-content"}} >
                <span className={`paragraph4 ${styles.playground_link} `}>Visit Playground</span>
              </Link>
            </div>

            <div className={styles.playground_item_wrapper}>
              <div className={styles.playground_media_wrapper}>
                <PixelMedia type="video" greyscale={false} src={showreel} autoPlay muted loop controls={false} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>

  )
}
