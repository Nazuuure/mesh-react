import { compareRoutes, rates } from '../../../economics.mjs';
import { isVanPool, loadKg, rover, space } from '../../../model.mjs';
import type { MeshState, Shipment, Trip } from '../types';
import { num, pointName, rub } from './format';
import { pilotDefaults, routeLabels, roverLimit } from './pilot';

export const activeTrips = (state: MeshState) => state.trips.filter(trip =>
    ['Погрузка', 'В пути', 'Разгрузка'].includes(trip.status));

export function courierStatus(trip: Trip) {
    const incident = trip.incident;
    if (!incident) return null;
    if (incident.resumedAt != null) return 'helped';
    return incident.dispatchedAt === null ? 'needed' : 'sent';
}

export const cargoLiters = (state: MeshState, requests: Shipment[]) => requests.reduce((total, request) =>
    total + (state.products.find(item => item.id === request.product)?.liters ?? 0) * request.qty, 0);

export function officeQueues(state: MeshState, office: string) {
    const inbound = state.requests.filter(request => request.target === office);
    const approvals = Object.groupBy(inbound.filter(request => request.status === 'Согласование'), request => request.batch ?? request.id);
    const departures = state.requests.filter(request => request.from === office && request.status === 'Погрузка');
    const trips = activeTrips(state).filter(trip => trip.route[0] === office && trip.status === 'Погрузка');
    const loads = Map.groupBy(departures, request => trips.find(trip => trip.ids.includes(request.id))?.id ?? request.id);

    return {
        approvals: Object.values(approvals).filter(batch => batch !== undefined),
        loads: Array.from(loads, ([id, items]) => ({ id, trip: trips.find(trip => trip.id === id), items })),
        arrivals: inbound.filter(request => ['Погрузка', 'В пути', 'Разгрузка'].includes(request.status)),
        ready: state.orders.filter(order => order.loc === office && order.status === 'Готов к выдаче'),
        history: state.orders.filter(order => order.loc === office && ['Выдан', 'Возвращён'].includes(order.status)).toReversed(),
    };
}


export function dispatchGroups(state: MeshState) {
    const queue = state.requests.filter(request => ['Новая', 'Ожидает места'].includes(request.status) && !isVanPool(state,request));
    const groups = Object.groupBy(queue, request => request.kind === 'Робот'
        ? 'robot-' + request.from
        : 'hub-' + state.places.find(place => place.id === request.to)?.city);

    return Object.entries(groups).flatMap(([key, requests]) => {
        if (!requests?.length) return [];
        const first = requests[0];
        const city = state.places.find(place => place.id === first.to)?.city;
        const isHub = first.kind === 'Магистраль';
        const offices = state.places.filter(place => place.id !== 'hub' && place.city === city);

        return [{
            key,
            isHub,
            requests,
            title: isHub ? 'Поставка в ' + city : 'Рейс из ' + pointName(state, first.from),
            pickupOptions: offices.map(office => [office.id, office.name + ' · свободно ' + num(space(state, office.id).free) + ' л'] as const),
        }];
    });
}

export type DispatchGroup = ReturnType<typeof dispatchGroups>[number];

export function loadSummary(state: MeshState, requests: Shipment[], isHub: boolean, now: number) {
    const units = requests.reduce((total, request) => total + request.qty, 0);
    if (!units) return '';
    const base = 'Выбрано ' + units + ' шт. · ' + num(cargoLiters(state, requests)) + ' л';
    if (isHub) return base;
    const range = units < rover.autoUnits ? 'ниже порога автосбора'
        : units < rover.idealMin ? 'ниже рекомендуемой загрузки'
        : units > rover.idealMax ? 'выше рекомендуемой загрузки' : 'рекомендуемая загрузка';
    const liters = cargoLiters(state, requests);
    const kilograms = loadKg(state, requests);
    const wait = Math.floor(Math.max(0, ...requests.map(request => (now - (request.queuedAt ?? now)) / 1000)));
    const comparison = compareRoutes({
        ...pilotDefaults, units, liters, meshDays: 0, hubDays: 0,
        stops: new Set(requests.map(request => request.to)).size,
        meshWait: wait, hubWait: wait + rates.hubWaitSeconds,
    });
    const limit = units < rover.autoUnits ? 'Автосбор от ' + rover.autoUnits + ' уп.' : roverLimit(units, liters, kilograms);
    const recommendation = limit
        ? (comparison.hubSeconds <= pilotDefaults.deadline ? 'hub' : 'neither')
        : comparison.recommendation;
    const advice = routeLabels[recommendation] + (limit ? ' · ' + limit : '');
    return base + ' из ' + num(rover.liters) + ' л · ' + num(kilograms) + ' из ' +
        rover.maxKg + ' кг · ' + range + ' · ' + advice + ' · рейс ' + rub(rates.roverTrip / units) +
        '/шт. · хаб ' + rub(rates.hubTransport) + '/шт. · ожидание уже ' + num(wait) + ' с.';
}
