import { itemName, pointAddress } from '../../functions/format';
import type { MeshState, Order, SendAction } from '../../types';
import shared from '../../styles/Shared.module.css';
import { Button } from '../Button/Button';
import { Entry } from '../Entry/Entry';
import { Journey } from '../Journey/Journey';
import { Tag } from '../Tag/Tag';

interface Props {
    state: MeshState;
    order: Order;
    send: SendAction;
    busy: boolean;
    offset: number;
    office?: string;
}

export function OrderCard({ state, order, send, busy, offset, office }: Props) {
    const delivery = order.status === 'Доставка' || order.status === 'В пути';
    const choice = !office && order.status === 'Предложение';
    const request = delivery ? state.requests.findLast(row => row.order === order.id &&
        row.status !== 'Доставлено' && row.status !== 'Отменено') : undefined;
    const source = request?.from ?? order.loc;

    return (
        <Entry>
            <div className={shared.row}>
                <strong>№{order.id} · {itemName(state, order.product)}</strong>
                <Tag>{order.status}</Tag>
            </div>
            {choice ? (
                <>
                    <p>Можно забрать здесь · <strong>{pointAddress(state, order.loc)}</strong></p>
                    <p>Выбранный пункт · {pointAddress(state, order.to)}</p>
                    <div className={shared.actions}>
                        <Button primary disabled={busy} onClick={() => void send({ type: 'choice', order: order.id, accept: true })}>Заберу здесь</Button>
                        <Button disabled={busy} onClick={() => void send({ type: 'choice', order: order.id, accept: false })}>Доставить в выбранный ПВЗ</Button>
                    </div>
                </>
            ) : delivery ? (
                <>
                    <p>{order.status === 'В пути' ? 'Отправлено' : 'Ожидается поставка'} · {pointAddress(state, source)}</p>
                    <p>Выбранный пункт · {pointAddress(state, order.to)}</p>
                    {request && <Journey shipment={request} offset={offset} />}
                </>
            ) : <p>Пункт выдачи · <strong>{pointAddress(state, order.loc)}</strong></p>}
            {office && order.status === 'Готов к выдаче' && (
                <Button primary disabled={busy} onClick={() => void send({ type: 'issue', order: order.id, place: office })}>Подтвердить выдачу</Button>
            )}
            {office && order.status === 'Выдан' && (
                <Button disabled={busy} onClick={() => void send({ type: 'return', order: order.id, place: office })}>Принять возврат</Button>
            )}
        </Entry>
    );
}
