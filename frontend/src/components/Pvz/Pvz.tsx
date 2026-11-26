import { num, placeOptions } from '../../functions/format';
import { cargoLiters } from '../../functions/logistics';
import { usePvz } from '../../hooks/usePvz';
import shared from '../../styles/Shared.module.css';
import type { CabinetProps } from '../../types';
import { Arrivals } from '../Arrivals/Arrivals';
import { Button } from '../Button/Button';
import { Entry } from '../Entry/Entry';
import { Field } from '../Field/Field';
import { Finances } from '../Finances/Finances';
import { Hero } from '../Hero/Hero';
import { OrderCard } from '../OrderCard/OrderCard';
import { Panel } from '../Panel/Panel';
import { RequestCard } from '../RequestCard/RequestCard';
import { RouteMap } from '../RouteMap/RouteMap';
import { SelectField } from '../SelectField/SelectField';
import { Stock } from '../Stock/Stock';

export function Pvz(props: CabinetProps) {
    const { state, send, busy, offset } = props;
    const pvz = usePvz(state, send);
    const office = pvz.point.id;
    const { approvals, loads, arrivals, ready, history } = pvz.queues;

    return (
        <>
            <Hero title="Рабочее место ПВЗ" description="Выдача заказов, приёмка и отправка грузов.">
                <SelectField label="Работаю в пункте" options={placeOptions(pvz.points)} value={office}
                    onChange={event => pvz.select(event.target.value)} />
            </Hero>
            <div className={shared.columns}>
                <Panel title="Готовы к выдаче" scroll>
                    {ready.length ? ready.map(order => <OrderCard key={order.id} {...props} order={order} office={office} />)
                        : <p>Заказов к выдаче нет</p>}
                </Panel>
                <Panel title="Запросы на приёмку" scroll>
                    {approvals.length ? approvals.map(items => {
                        const batch = items[0].batch ?? items[0].id;
                        return (
                            <Entry key={batch}>
                                <strong>Партия №{batch} · {num(cargoLiters(state, items))} л</strong>
                                {items.map(shipment => <RequestCard key={shipment.id} state={state} shipment={shipment} offset={offset} />)}
                                <div className={shared.actions}>
                                    <Button primary disabled={busy} onClick={() => void send({ type: 'reply', batch, place: office, accept: true })}>
                                        Согласовать приёмку
                                    </Button>
                                    <Button disabled={busy} onClick={() => void send({ type: 'reply', batch, place: office, accept: false })}>
                                        Отклонить и перенаправить
                                    </Button>
                                </div>
                            </Entry>
                        );
                    }) : <p>Входящих запросов нет</p>}
                </Panel>
                <Panel title="Грузы к отправке" scroll>
                    {loads.length ? loads.map(({ id, trip, items }) => (
                        <Entry key={id}>
                            {trip && <strong>Рейс №{trip.id}</strong>}
                            {items.map(shipment => <RequestCard key={shipment.id} state={state} shipment={shipment} offset={offset}>
                                <Button disabled={busy} onClick={()=>{
                                    const value=window.prompt('Сколько упаковок не найдено при сборке?')
                                    if(value!==null)void send({type:'shortage',request:shipment.id,place:office,missing:Number(value)})
                                }}>Указать недостачу</Button>
                            </RequestCard>)}
                            <Button primary disabled={busy} onClick={() => void send({ type: 'ship', request: items[0].id, place: office })}>
                                Подтвердить погрузку и отправку
                            </Button>
                        </Entry>
                    )) : <p>Грузов к отправке нет</p>}
                </Panel>
                <Panel title="Ожидаемые поступления" scroll>
                    <Arrivals {...props} office={office} arrivals={arrivals} />
                </Panel>
            </div>
            <RouteMap state={state} office={office} offset={offset} />
            <Panel title="Выданные заказы и возвраты" scroll>
                {history.length ? history.map(order => <OrderCard key={order.id} {...props} order={order} office={office} />)
                    : <p>Выданных заказов нет</p>}
            </Panel>
            <Panel title="Вместимость мини-склада">
                <div className={shared.row}>
                    <p>
                        <strong>{num(pvz.volume.free)} л</strong> свободно · занято {num(pvz.volume.used)} л
                        · под заявки {num(pvz.volume.held)} л · зона выдачи {num(pvz.volume.pickup)} л
                    </p>
                    <form key={office + ':' + pvz.point.capacity} className={shared.form} onSubmit={pvz.capacity}>
                        <Field label="Вместимость, л" name="value" type="number" defaultValue={pvz.point.capacity} min={0} step="any" required />
                        <Button type="submit" primary disabled={busy}>Сохранить</Button>
                    </form>
                </div>
            </Panel>
            <div className={shared.columns}>
                <Panel title="Остатки" scroll><Stock state={state} office={office} /></Panel>
                <Panel title="Экономика ПВЗ" scroll><Finances state={state} role="pvz" office={office} /></Panel>
            </div>
        </>
    );
}
