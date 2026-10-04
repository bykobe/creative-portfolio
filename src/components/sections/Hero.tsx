import NameMark from '../ui/svgs/NameMark'
import styles from './Hero.module.css'

export default function Hero() {
  return (
    <>
      <div className={styles.heroWrapper}>
        <div className={styles.heroBody}>
          <div className={styles.nameMark}>
            <NameMark className={styles.nameMarkSvg} />
          </div>
          <div className={styles.heroContent}>
          <div className={styles.heroDesc}>
            <p className={styles.heroDescText}>Art direction meets collage chaos.
              I design bold, layered identities
              with personality.</p>
          </div>
          <div className={styles.scrollIndicator}>
            <span>Scroll down</span>
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
