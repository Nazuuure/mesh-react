import type { ReactNode } from 'react';
import styles from './Hero.module.css';

export function Hero({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
    return (
        <div className={styles.hero}>
            <div><h1>{title}</h1><p>{description}</p></div>
            {children && <div className={styles.controls}>{children}</div>}
        </div>
    );
}
