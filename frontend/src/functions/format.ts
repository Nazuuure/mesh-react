import type { MeshState, Option, Place, Product } from '../types';

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export const num = (value: number) => numberFormat.format(value);
export const rub = (value: number) => num(value) + ' ₽';
export const formValue = (data: FormData, name: string) => String(data.get(name) ?? '');

export const pickupPoints = (state: MeshState) => state.places.filter(point => point.id !== 'hub');

export function pointName(state: MeshState, id: string) {
    const point = state.places.find(place => place.id === id);
    if (!point) return '—';
    return id === 'hub' ? point.name : 'ПВЗ «' + point.name + '»';
}

export function pointAddress(state: MeshState, id: string) {
    const point = state.places.find(place => place.id === id);
    return point ? [point.city, pointName(state, id), point.address].filter(Boolean).join(', ') : '—';
}

export const itemName = (state: MeshState, id: number) => state.products.find(item => item.id === id)?.name ?? 'Товар';

export const placeOptions = (places: Place[]): Option[] => places.map(point => [point.id, point.city + ' · ' + point.name]);
export const productOptions = (products: Product[]): Option[] => products.map(item => [item.id, item.name]);
