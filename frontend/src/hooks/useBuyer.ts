import { useState } from 'react';
import { getCatalog, sortBuyerOrders } from '../functions/catalog';
import { pickupPoints } from '../functions/format';
import type { MeshState } from '../types';
import { usePickupPoint } from './usePickupPoint';

export function useBuyer(state: MeshState) {
    const points = pickupPoints(state);
    const [point, select] = usePickupPoint(points, 'buyer-destination', 'p2');
    const [category, setCategory] = useState('Все');
    const [query, setQuery] = useState('');

    return {
        points, point, select, category, setCategory, query, setQuery,
        catalog: getCatalog(state, point, category, query),
        orders: sortBuyerOrders(state.orders),
    };
}
