// ButtonLink.tsx
import Link from "next/link";
import { ComponentProps } from "react";
import styles from "./ui.module.css";

type ButtonLinkProps = ComponentProps<typeof Link> & { children?: React.ReactNode };

export default function ButtonLink({ children, className = "", ...props }: ButtonLinkProps) {
  return (
    <Link {...props} className={`${styles.btn} ${className}`.trim()}>
      <span>{children}</span>
    </Link>
  );
}
