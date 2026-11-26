import { freeStock } from '../../../model.mjs';
import type { MeshState } from '../types';
import { pointName, rub } from './format';

export function stockReport(state: MeshState, office?: string) {
    return state.products.flatMap(item => {
        const locations = Object.entries(item.stock).filter(([id, qty]) => qty > 0 && (!office || office === id));
        if (!locations.length) return [];
        const details = locations.map(([id, qty]) =>
            pointName(state, id) + ': ' + freeStock(state, item, id) + ' свободно из ' + qty).join(' · ');
        return [{ item, details }];
    });
}

export function financeReport(state: MeshState, role: 'pvz' | 'seller' | 'wb', office?: string) {
    return state.ledger.filter(entry => !office || entry.loc === office).toReversed().map(entry => {
        const heading = role === 'wb' ? 'Эффект: ' + rub(entry.saving)
            : rub(role === 'pvz' ? entry.pvz : entry.seller) + ' прибыли';
        const details = role === 'pvz' ? 'Начислено ' + rub(entry.payout) + ' · труд 12 ₽ · хранение ' + rub(entry.storage)
            : role === 'seller' ? 'Продажа ' + rub(entry.price) + ' · себестоимость ' + rub(entry.price * 0.6) +
                ' · комиссия ' + rub(entry.price * 0.1) + ' · ПВЗ ' + rub(entry.payout) + ' · рейс ' + rub(entry.transport)
                : 'Базовый хаб 80 ₽ · выплаты ПВЗ ' + rub(entry.payout) + ' · перевозка ' + rub(entry.transport);
        const returned = state.orders.find(order => order.id === entry.order)?.status === 'Возвращён';
        return { id: entry.order, heading, details, returned };
    });
}
