import Image from "next/image";
import styles from "./Spotlight.module.css"
import { kobe } from "../ui/assets";

export default function Spotlight() {
  return (
    <section className={styles.spotlightWrapper}>
      <div className={styles.spotlightBody}>
        <div className={styles.spotlightBackText}>
          <div className={styles.spotlightBTWrapper}>
            <h1 className={`heading1 ${styles.spotlightText}`}>Design Engineer</h1>
            <h1 className={`heading1 ${styles.spotlightText}`}>Design Engineer</h1>
          </div>


          <div className={styles.spotlightImgWrapper}>
            <Image src={kobe} alt="Kobby" width={1000} height={1000} className={styles.spotlightImg} />
          </div>
        </div>


        <div className={styles.spotlightInfo}>
          <div className={styles.spotlightInfoContent}>
            <span>BASED In Accra, Ghana | EU Remote (CET)</span>
            <span>AVAILABLE TODAY</span>
          </div>
        </div>
      </div>
    </section>
  );
}
