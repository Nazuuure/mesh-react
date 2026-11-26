import type { ReactNode } from 'react';
import type { Role } from '../../types';
import styles from './Layout.module.css';

export const roleNames: Record<Role, string> = {
    buyer: 'Покупатель',
    seller: 'Продавец',
    pvz: 'Сотрудник ПВЗ',
    wb: 'Диспетчер WB',
};

export function Layout({ role, day, message, children }: {
    role: Role;
    day?: number;
    message: string;
    children: ReactNode;
}) {
    return (
        <>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <a className={styles.brand} href="/buyer/"><span aria-hidden="true" />Контур</a>
                    <nav className={styles.nav} aria-label="Кабинеты">
                        {Object.entries(roleNames).map(([id, name]) => (
                            <a key={id} href={'/' + id + '/'} aria-current={id === role ? 'page' : undefined}>{name}</a>
                        ))}
                    </nav>
                </div>
            </header>
            <main className={styles.main}>{children}</main>
            <footer className={styles.footer}><span>CPS Group · прототип городской доставки</span>{day !== undefined && <span>День {day}</span>}</footer>
            <div className={styles.toast} role="status" aria-live="polite">{message}</div>
        </>
    );
}
