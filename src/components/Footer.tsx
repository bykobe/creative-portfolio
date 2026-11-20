"use client";

import Link from "next/link"
import styles from "./components.module.css"
import { contact, navigation } from "./ui/assets"
import FooterMark from "./ui/svgs/FooterMark"
import ImageTrail from "./ui/ImageTrial";
import { imt_1, imt_2, imt_3, imt_4, imt_5, imt_6, imt_7 } from "./ui/assets";

export default function Footer() {

  return (
    <footer className={styles.footer}>
      <div className={styles.footerSticky}>
        <ImageTrail images={[imt_1, imt_2, imt_3, imt_4, imt_5, imt_6, imt_7]} />
        <div className={styles.footer_body}>
          <div className={styles.footer_body_ts}>
            <div className={styles.contact_wrapper}>
              <div className={styles.contact_item_title}>
                <h4 className="paragraph5">Contact</h4>
              </div>
              <ul className={styles.contact_item_group}>
                {contact.map(({name, link}, idx) => {
                  return (
                    <li className={styles.contact_item} key={idx}>
                      <Link href={link}>
                        <span className="paragraph4">{name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className={styles.nav_wrapper}>

              <div className={styles.nav_item_title}>
                <h4 className="paragraph5">Navigation</h4>
              </div>
              <ul className={styles.nav_item_group}>
                {navigation.map(({name, link}, idx) => {
                  return (
                    <li className={styles.nav_item} key={idx}>
                      <Link href={link}>
                        <span className="paragraph4">{name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>

            </div>
            <div className={styles.credits_wrapper}>
              <span className="paragraph4">Designed & Developed by Kobe</span>
              <span className="paragraph4">Accra, Ghana | EU Remote (CET)</span>
            </div>
          </div>
          <>
            <div className={styles.footer_body_bs}>
              <span className="paragraph4">COPYRIGHT 2026</span>
              <div className={styles.footermark_wrapper}>
                <FooterMark />
              </div>
            </div>
          </>
        </div>
      </div>
    </footer>
  )
}
