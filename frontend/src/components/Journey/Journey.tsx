import { useServerClock } from '../../hooks/useServerClock';
import type { Shipment } from '../../types';
import styles from './Journey.module.css';

export function Journey({ shipment, offset }: { shipment: Shipment; offset: number }) {
    const now = useServerClock(offset);
    if (shipment.pausedAt != null) return <small>Рейс приостановлен</small>;
    if (shipment.status !== 'В пути' || shipment.sentAt == null || shipment.eta == null) return null;

    const left = Math.max(0, Math.ceil((shipment.eta - now) / 1000));
    const percent = left ? Math.max(0, 100 * (now - shipment.sentAt) / Math.max(1, shipment.eta - shipment.sentAt)) : 100;

    return (
        <div className={styles.journey}>
            <progress max={100} value={percent} aria-label="Ход доставки" />
            <small>{left ? 'До прибытия: ' + left + ' с' : 'Прибыло · ожидает подтверждения ПВЗ'}</small>
        </div>
    );
}
