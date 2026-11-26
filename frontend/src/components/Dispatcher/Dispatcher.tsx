import { rover } from '../../../../model.mjs';
import { num, pointName } from '../../functions/format';
import { useDispatcher } from '../../hooks/useDispatcher';
import shared from '../../styles/Shared.module.css';
import type { CabinetProps } from '../../types';
import { Button } from '../Button/Button';
import { DispatchForm } from '../DispatchForm/DispatchForm';
import { Entry } from '../Entry/Entry';
import { Finances } from '../Finances/Finances';
import { Hero } from '../Hero/Hero';
import { Panel } from '../Panel/Panel';
import { RequestCard } from '../RequestCard/RequestCard';
import { RouteMap } from '../RouteMap/RouteMap';
import { Tag } from '../Tag/Tag';
import styles from './Dispatcher.module.css';

interface Props extends CabinetProps {
    notify: (message: string) => void;
}

export function Dispatcher({ state, send, busy, offset, notify }: Props) {
    const dispatcher = useDispatcher(state, send);

    return (
        <>
            <Hero title="Диспетчерская WB" description="Сгруппируйте заявки одного города или соберите рейс робота." />
            <RouteMap state={state} offset={offset} />
            {dispatcher.hubLoads.length > 0 && (
                <Panel title="Передача груза">
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
            <Panel title="Очередь заявок">
                {dispatcher.groups.length ? dispatcher.groups.map(group => (
                    <DispatchForm key={group.key} state={state} send={send} busy={busy} group={group} notify={notify} />
                )) : <p>Новых заявок нет. Создайте перемещение у продавца или оформите заказ.</p>}
            </Panel>
            <Panel title="Рейсы роботов">
                <p className={shared.muted}>
                    Багажник {num(rover.liters)} л · груз до {rover.maxKg} кг · от {rover.minUnits} упаковок
                    · рекомендуемая загрузка {rover.idealMin}–{rover.idealMax}
                </p>
                {dispatcher.trips.length ? dispatcher.trips.map(trip => (
                    <Entry key={trip.id}>
                        <div className={shared.row}><strong>{trip.robot} · рейс №{trip.id}</strong><Tag>{trip.status}</Tag></div>
                        <p>{trip.route.map(id => pointName(state, id)).join(' → ')}</p>
                        {dispatcher.active.has(trip.id) && (
                            <div className={shared.actions}>
                                <small>Отправку подтверждает исходный пункт, получение — принимающий.</small>
                                {trip.status === 'В пути' && !trip.incident && (
                                    <Button disabled={busy} onClick={() => void send({ type: 'stuck', trip: trip.id })}>Симулировать застревание</Button>
                                )}
                                {trip.incident && (
                                    <small>Курьер из {pointName(state, trip.incident.office)} {trip.incident.resumedAt ? 'подтвердил помощь' : 'выслан к роверу'}</small>
                                )}
                                <Button disabled={busy} onClick={() => void send({ type: 'failure', trip: trip.id })}>Сбой и возврат на базу</Button>
                            </div>
                        )}
                    </Entry>
                )) : <p>Рейсов пока нет</p>}
            </Panel>
            <Panel title="Экономика WB"><Finances state={state} role="wb" /></Panel>
            <Panel title="Все заявки">
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
