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
                {shipment.missing && <small>Остаток ожидает уточнения от перевозчика</small>}
                {shipment.status==='В пути' && shipment.qty>1 && shipment.pausedAt==null && <Button disabled={busy || now<(shipment.eta??0)} onClick={()=>{
                    const credited=shipment.receipts?.reduce((sum,event)=>sum+event.qty,0)??0
                    const value=window.prompt('Сколько упаковок принято всего по этой поставке? Уже учтено: '+credited)
                    if(value!==null && Number(value)>credited)void send({type:'receive',request:shipment.id,place:office,received:Number(value)-credited,eventId:'total-'+Number(value)})
                }}>Частичная приёмка</Button>}
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
