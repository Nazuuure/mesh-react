import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    primary?: boolean;
}

export function Button({ primary, type = 'button', className = '', ...props }: Props) {
    return <button {...props} type={type} className={[styles.button, primary ? styles.primary : '', className].join(' ')} />;
}
