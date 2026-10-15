
"use client";

import styles from "./handler.module.css";
import { useState } from "react";
import Link from "next/link";

export default function PageHandler() {
  const [activeVersion, setActiveVersion] = useState("creative");

  return (
    <div className={styles.handler_wrapper}>
      <div className={styles.handler_container}>
        {/* Information Description */}
        <div className={styles.handler_info}>
          <span style={{fontSize: "var(--paragraph-3)", fontFamily: "var(--pixelify-font)"}}>(i) Information Box</span>
          <span>
            This is a creative portfolio. For a quick summarized
            version, check out the corporate version below.
          </span>
        </div>

        {/* Redirection Buttons */}
        <div className={styles.handler_dir}>
          <Link
            href=""
            className={
              activeVersion === "creative"
                ? styles.active
                : styles.inactive
            }
            onClick={() => setActiveVersion("creative")}
          >
            [CREATIVE VERSION]
          </Link>

          <Link
            href="/corporate"
            className={
              activeVersion === "corporate"
                ? styles.active
                : styles.inactive
            }
            onClick={() => setActiveVersion("corporate")}
          >
            [CORPORATE VERSION]
          </Link>
        </div>
      </div>
    </div>
  );
}
