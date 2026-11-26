import type { ReactNode } from 'react';
import styles from './Entry.module.css';

export function Entry({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={[styles.entry, className].join(' ')}>{children}</div>;
}
