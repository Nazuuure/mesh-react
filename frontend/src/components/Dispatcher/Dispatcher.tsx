import { isVanPool, vanQuote, rover } from '../../../../model.mjs';
import { num, pointName, rub } from '../../functions/format';
import { courierStatus } from '../../functions/logistics';
import { useDispatcher } from '../../hooks/useDispatcher';
import shared from '../../styles/Shared.module.css';
import type { CabinetProps } from '../../types';
import { Button } from '../Button/Button';
import { DispatchForm } from '../DispatchForm/DispatchForm';
import { Entry } from '../Entry/Entry';
import { Finances } from '../Finances/Finances';
import { Hero } from '../Hero/Hero';
import { Panel } from '../Panel/Panel';
import { PilotComparison } from '../PilotComparison/PilotComparison';
import { RequestCard } from '../RequestCard/RequestCard';
import { RouteMap } from '../RouteMap/RouteMap';
import { RoverCameras } from '../RoverCameras/RoverCameras';
import { Tag } from '../Tag/Tag';
import styles from './Dispatcher.module.css';

interface Props extends CabinetProps {
    notify: (message: string) => void;
}

export function Dispatcher({ state, send, busy, offset, notify }: Props) {
    const dispatcher = useDispatcher(state, send);

    const pools=Map.groupBy(state.requests.filter(r=>isVanPool(state,r)),r=>r.from+"-"+r.to);
    return (
        <>
            <Hero title="Диспетчерская WB" description="Следите за автоматическими рейсами роверов, поставками с хаба и сбоями." />
            <div className={shared.columns}>
                <RouteMap state={state} offset={offset} />
                <RoverCameras state={state} />
            </div>
            {dispatcher.hubLoads.length > 0 && (
                <Panel title="Передача груза" scroll>
                    {dispatcher.hubLoads.map(shipment => (
                        <RequestCard key={shipment.id} state={state} shipment={shipment} offset={offset}>
                            <div className={styles.ship}>
                                <Button primary disabled={busy} onClick={() => void send({ type: 'ship', request: shipment.id, place: 'hub' })}>
                                    Подтвердить отправку
                                </Button>
                            </div>
                        </RequestCard>
                    ))}
                </Panel>
            )}
            <details className={shared.panel}>
                <summary>Координаты и расстояния между точками</summary>
                <p>Демонстрационные координаты. Расстояние по прямой, км.</p>
                <div style={{overflowX:'auto'}}><table>
                    <thead><tr><th>Точка</th><th>Широта, долгота</th>{state.places.map(p=><th key={p.id}>{p.name}</th>)}</tr></thead>
                    <tbody>{state.places.map(p=><tr key={p.id}><th>{p.city} · {p.name}</th><td>{p.lat}, {p.lon}</td>
                        {state.places.map(q=><td key={q.id}>{num(p.distancesKm[q.id])}</td>)}</tr>)}</tbody>
                </table></div>
            </details>
            <Panel title="Пул Газели">
                <p>Городские плечи свыше 8 км. Учебный тариф: 600 ₽ за подачу и 25 ₽/км с обратным пробегом.</p>
                {pools.size===0 && <p>Дальних заявок пока нет.</p>}
                {Array.from(pools,([key,rows])=>{
                    const q=vanQuote(state,rows);
                    const ids=rows.map(r=>r.id);
                    return <Entry key={key}>
                        <b>{pointName(state,rows[0].from)} → {pointName(state,rows[0].to)} · {num(q.km)} км</b>
                        <p>{q.units} уп. · вызов от {q.minimum} уп. · рейс {rub(q.fare)} · эффект к хабу {rub(q.saving)}</p>
                        <Button disabled={busy || q.saving<=0} onClick={()=>void send({type:'van',ids})}>Вызвать Газель</Button>
                        <Button disabled={busy} onClick={()=>void send({type:'viaHub',ids,place:'',purpose:'auto'})}>Через хаб</Button>
                    </Entry>
                })}
            </Panel>
            <Panel title="Очередь заявок" scroll>
                {dispatcher.groups.length ? dispatcher.groups.map(group => (
                    <DispatchForm key={group.key} state={state} send={send} busy={busy} group={group} notify={notify} offset={offset} />
                )) : <p>Новых заявок нет. Создайте перемещение у продавца или оформите заказ.</p>}
            </Panel>
            <Panel title="Рейсы роботов" scroll>
                <p className={shared.muted}>
                    Багажник {num(rover.liters)} л · груз до {rover.maxKg} кг · автоназначение от {rover.autoUnits} упаковок
                    · окно сбора {rover.collectMilliseconds / 1000} с
                </p>
                {dispatcher.trips.length ? dispatcher.trips.map(trip => {
                    const courier = courierStatus(trip);
                    const inTransit = trip.status === 'В пути';
                    const stopped = inTransit && (courier === 'needed' || courier === 'sent');
                    return (
                        <Entry key={trip.id}>
                            <div className={shared.row}>
                                <strong>{trip.robot} · рейс №{trip.id}</strong>
                                <Tag>{stopped ? 'Ровер застрял' : trip.status}</Tag>
                            </div>
                            <p>{trip.route.map(id => pointName(state, id)).join(' → ')}</p>
                            {trip.assistanceCost !== undefined && <p>Помощь курьера · {rub(trip.assistanceCost)}</p>}
                            {!!trip.failedTransport && <p>Затраты на прерванную перевозку · {rub(trip.failedTransport)}</p>}
                            {dispatcher.active.has(trip.id) && (
                                <div className={shared.actions}>
                                    {inTransit && courier === null && (
                                        <Button disabled={busy} onClick={() => void send({ type: 'stuck', trip: trip.id })}>
                                            Симулировать застревание
                                        </Button>
                                    )}
                                    {inTransit && courier === 'needed' && (
                                        <Button primary disabled={busy} onClick={() => void send({ type: 'dispatchCourier', trip: trip.id })}>
                                            Отправить курьера
                                        </Button>
                                    )}
                                    {inTransit && courier === 'sent' && (
                                        <>
                                            <small>Курьер отправлен</small>
                                            <Button primary disabled={busy} onClick={() => void send({ type: 'rescue', trip: trip.id })}>
                                                Подтвердить помощь и продолжить рейс
                                            </Button>
                                        </>
                                    )}
                                    <Button disabled={busy} onClick={() => void send({ type: 'failure', trip: trip.id })}>Сбой и возврат на базу</Button>
                                </div>
                            )}
                        </Entry>
                    );
                }) : <p>Рейсов пока нет</p>}
            </Panel>
            <PilotComparison />
            <Panel title="Экономика WB" scroll><Finances state={state} role="wb" /></Panel>
            <Panel title="Все заявки" scroll>
                {dispatcher.history.length ? dispatcher.history.map(shipment => (
                    <RequestCard key={shipment.id} state={state} shipment={shipment} offset={offset} />
                )) : <p>История пуста</p>}
            </Panel>
            <details className={styles.demo}>
                <summary>Управление демонстрацией</summary>
                <p>День {state.day}. Перевод времени добавляет день хранения и ожидания.</p>
                <div className={shared.actions}>
                    <Button disabled={busy} onClick={() => void send({ type: 'day' })}>Следующий день</Button>
                    <Button disabled={busy} onClick={dispatcher.reset}>Восстановить демоданные</Button>
                </div>
            </details>
        </>
    );
}
