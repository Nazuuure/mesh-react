import type { SelectHTMLAttributes } from 'react';
import type { Option } from '../../types';
import styles from '../Field/Field.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: readonly Option[];
}

export function SelectField({ label, options, ...props }: SelectProps) {
    return (
        <label className={styles.field}>
            {label}
            <select {...props}>
                {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
        </label>
    );
}
