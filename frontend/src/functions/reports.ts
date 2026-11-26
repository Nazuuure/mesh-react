import { freeStock } from '../../../model.mjs';
import type { LedgerEntry, MeshState } from '../types';
import { num, pointName, rub } from './format';

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
        const heading = role === 'wb' ? (entry.comparison ? 'Эффект: ' : 'Прежняя оценка: ') + rub(entry.saving)
            : rub(role === 'pvz' ? entry.pvz : entry.seller) + ' прибыли';
        const details = role === 'pvz' ? 'Начислено ' + rub(entry.payout) + ' · труд 12 ₽ · хранение ' + rub(entry.storage)
            : role === 'seller' ? 'Продажа ' + rub(entry.price) + ' · себестоимость ' + rub(entry.price * 0.6) +
                ' · комиссия ' + rub(entry.price * 0.1) + ' · ПВЗ ' + rub(entry.payout) + ' · рейс ' + rub(entry.transport)
                : warehouseDetails(entry);
        const returned = state.orders.find(order => order.id === entry.order)?.status === 'Возвращён';
        return { id: entry.order, heading, details, returned };
    });
}

function warehouseDetails(entry: LedgerEntry) {
    if (!entry.comparison) return 'Начисления по прежним тарифам · ПВЗ ' + rub(entry.payout) + ' · перевозка ' + rub(entry.transport);
    const { mesh, hub } = entry.comparison;
    const costs = 'Фактически ' + rub(mesh.total) + ' · сравнимый хаб ' + rub(hub.total) +
        ' · хранение ' + rub(mesh.storage) + ' · обработка и выдача ' + rub(mesh.handling + mesh.pickup) +
        ' · перевозка ' + rub(mesh.transport) + ' · возврат ' + rub(mesh.returnCost) +
        ' · сбои ' + rub(mesh.failed) + ' · курьер ' + rub(mesh.assistance);
    const elapsed = entry.elapsed == null ? '' : ' · до готовности ' + num(entry.elapsed) + ' с';
    const waiting = entry.waiting == null ? '' : ' · до отправки ' + num(entry.waiting) + ' с';
    return costs + elapsed + waiting;
}
