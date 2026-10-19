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
              <p className={styles.heroDescText}>
                Welcome to my chaotic yet creative world.
              I design cool sh*t with personality.</p>
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
