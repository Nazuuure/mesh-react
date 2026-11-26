import { useState } from 'react';
import { freeStock } from '../../../model.mjs';
import { formValue, pickupPoints } from '../functions/format';
import type { MeshState, SendAction } from '../types';
import { useFormAction } from './useFormAction';

export function useSeller(state: MeshState, send: SendAction) {
    const points = pickupPoints(state);
    const cities = [...new Set(points.map(point => point.city))];
    const [city, setCity] = useState(cities[0]);
    const [category, setCategory] = useState('Электроника');
    const [selectedProduct, setProduct] = useState(state.products[0]?.id);
    const product = state.products.find(item => item.id === selectedProduct) ?? state.products[0];
    const sources = product ? state.places.filter(point => freeStock(state, product, point.id) > 0) : [];

    const restock = useFormAction(send, form => ({
        type: 'restock',
        product: formValue(form, 'product'),
        qty: formValue(form, 'qty'),
        place: formValue(form, 'place'),
    }));
    const transfer = useFormAction(send, form => ({
        type: 'transfer',
        product: formValue(form, 'product'),
        qty: formValue(form, 'qty'),
        place: formValue(form, 'place'),
        to: formValue(form, 'to'),
    }));

    return { points, cities, city, setCity, category, setCategory, product, setProduct, sources, restock, transfer };
}
