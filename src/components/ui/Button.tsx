import { ComponentPropsWithRef } from 'react';
import styles from './ui.module.css';

export default function Button({ children, onClick, className, ref }: { children: React.ReactNode; onClick: () => void; className: string; ref?: ComponentPropsWithRef<'button'>['ref']; }) {
  return (
    <button onClick={onClick} ref={ref} className={`${styles.btn} ${className}`}>
      {children}
    </button>
  );
}
