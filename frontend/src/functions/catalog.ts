import { localKm, roverRadiusKm, freeStock, rover, source, travelSeconds } from '../../../model.mjs';
import type { MeshState, Order, Place } from '../types';
import { pickupPoints, pointAddress } from './format';

function orderPriority(order: Order) {
    if (order.status === 'Готов к выдаче') return 0;
    if (order.status === 'Выдан' || order.status === 'Возвращён') return 2;
    return 1;
}

export function sortBuyerOrders(orders: Order[]) {
    return orders.toSorted((left, right) => orderPriority(left) - orderPriority(right) || right.id - left.id);
}

export function getCatalog(state: MeshState, pickup: Place, category: string, query: string) {
    const search = query.trim().toLocaleLowerCase('ru');
    const offices = pickupPoints(state);

    const listings = state.products
        .filter(item => (category === 'Все' || item.category === category) &&
            (item.name + ' ' + item.category).toLocaleLowerCase('ru').includes(search))
        .map(item => {
            const stock = source(state, item, pickup.id);
            const nearby = stock && stock.id !== 'hub' && stock.city === pickup.city;
            const here = stock?.id === pickup.id;
            const availability = here ? 0 : nearby ? 1 : stock ? 2 : 3;
            const byRover = nearby && localKm(stock,pickup)<=roverRadiusKm && item.liters <= rover.liters && (item.weightKg ?? 1) <= rover.maxKg;
            const seconds = here ? 0 : stock ? travelSeconds(byRover ? 1 : 0) : Infinity;
            const timing = here || !stock ? '' : (byRover ? 'Ровер от ' : 'Около ') + seconds + ' с после отправки';
            const distance = nearby ? localKm(stock,pickup) : 0;
            const hint = ['Готов к выдаче', 'Можно забрать в соседнем ПВЗ', 'Потребуется поставка', 'Нет в наличии'][availability];

            return {
                item,
                available: Boolean(stock),
                seconds,
                timing,
                distance,
                hint,
                address: stock ? pointAddress(state, stock.id) : '',
                locations: offices.filter(point => freeStock(state, item, point.id) > 0),
            };
        });

    const recommended = listings.filter(row => row.available)
        .toSorted((left, right) => left.seconds - right.seconds || left.distance - right.distance)
        .slice(0, 6);
    return { recommended, other: listings.filter(row => !recommended.includes(row)) };
}

export type Listing = ReturnType<typeof getCatalog>['recommended'][number];
