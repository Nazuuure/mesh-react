import type { InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export function Field({ label, ...props }: InputProps) {
    return <label className={styles.field}>{label}<input {...props} /></label>;
}
