import Image from "next/image";
import { inspo1, inspo2, inspo3, inspo4 } from "../ui/assets";
import styles from "./Inspo.module.css";

export default function Inspo() {
  return (
    <section className={styles.inspoWrapper}>
      <div className={styles.inspoBody}>
        <div className={styles.inspoTitleWrapper}>
          <h1 className={`heading1 ${styles.inspoTitle}`}>
            Inspo Loop
          </h1>
        </div>

        <div className={styles.inspoContentWrapper}>
          {InspoItems.map(({img, alt}, idx) => {
            return (
              <div className={styles.inspoImgWrapper} key={idx}>
                <Image src={img} alt={alt} fill className={styles.inspoImg} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  );
}


const InspoItems = [
  {
    img: inspo1,
    alt: "",
  },
  {
    img: inspo2,
    alt: "",
  },
  {
    img: inspo3,
    alt: "",
  },
  {
    img: inspo4,
    alt: "",
  },
]
