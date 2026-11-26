import type { ReactNode } from 'react';
import { itemName, pointName } from '../../functions/format';
import type { MeshState, Shipment } from '../../types';
import shared from '../../styles/Shared.module.css';
import { Entry } from '../Entry/Entry';
import { Journey } from '../Journey/Journey';
import { Tag } from '../Tag/Tag';

export function RequestCard({ state, shipment, offset, children }: {
    state: MeshState;
    shipment: Shipment;
    offset: number;
    children?: ReactNode;
}) {
    return (
        <Entry>
            <div className={shared.row}>
                <strong>№{shipment.id} · {itemName(state, shipment.product)} × {shipment.qty}</strong>
                <Tag>{shipment.status}</Tag>
            </div>
            <p>{pointName(state, shipment.from)} → {pointName(state, shipment.to)}</p>
            <small>
                {shipment.purpose === 'pickup' ? 'На выдачу' : 'На хранение'}
                {shipment.order ? ' · заказ №' + shipment.order : ''}
                {shipment.target ? ' · приём: ' + pointName(state, shipment.target) : ''}
            </small>
            {(shipment.status === 'В пути' || shipment.pausedAt != null) && <Journey shipment={shipment} offset={offset} />}
            {children}
        </Entry>
    );
}
