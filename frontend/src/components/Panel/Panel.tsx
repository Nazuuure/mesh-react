import type { ReactNode } from 'react';
import styles from './Panel.module.css';

export function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className={styles.panel}>
            <h2>{title}</h2>
            {children}
        </div>
    );
}
