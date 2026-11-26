import { rover } from '../../../../model.mjs';
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
