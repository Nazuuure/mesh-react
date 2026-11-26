import { useServerClock } from '../../hooks/useServerClock';
import type { CabinetProps, Shipment } from '../../types';
import { Button } from '../Button/Button';
import { RequestCard } from '../RequestCard/RequestCard';
import styles from './Arrivals.module.css';

interface Props extends CabinetProps {
    office: string;
    arrivals: Shipment[];
}

export function Arrivals({ arrivals, office, state, offset, busy, send }: Props) {
    const now = useServerClock(offset);
    if (!arrivals.length) return <p>Ожидаемых поступлений нет</p>;
    return arrivals.map(shipment => (
        <RequestCard key={shipment.id} state={state} shipment={shipment} offset={offset}>
            <div className={styles.action}>
                {shipment.pausedAt != null ? <small>Рейс приостановлен</small>
                    : shipment.status === 'Погрузка' ? <small>Ожидает отправки</small>
                    : (
                        <Button primary disabled={busy || now < (shipment.eta ?? 0)}
                            onClick={() => void send({ type: 'receive', request: shipment.id, place: office })}>
                            Подтвердить получение
                        </Button>
                    )}
            </div>
        </RequestCard>
    ));
}
