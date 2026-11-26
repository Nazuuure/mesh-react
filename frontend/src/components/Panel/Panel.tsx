import type { ReactNode } from 'react';
import styles from './Panel.module.css';

interface Props {
    title: string;
    children: ReactNode;
    scroll?: boolean;
}

export function Panel({ title, children, scroll }: Props) {
    return (
        <div className={styles.panel}>
            <h2>{title}</h2>
            {scroll ? (
                <div className={styles.scrollable} role="region" aria-label={title} tabIndex={0}>
                    {children}
                </div>
            ) : children}
        </div>
    );
}
