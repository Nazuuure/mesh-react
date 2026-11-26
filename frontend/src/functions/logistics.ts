import { loadKg, rover, space } from '../../../model.mjs';
import type { MeshState, Shipment, Trip } from '../types';
import { num, pointName, rub } from './format';

export const activeTrips = (state: MeshState) => state.trips.filter(trip =>
    ['Погрузка', 'В пути', 'Разгрузка'].includes(trip.status));

export const visitsOffice = (trip: Trip, office: string) => trip.route.includes(office) || trip.incident?.office === office;

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
        incidents: tripsForRescue(state, office),
    };
}

function tripsForRescue(state: MeshState, office: string) {
    return activeTrips(state).filter(trip => trip.status === 'В пути' &&
        trip.incident?.office === office && trip.incident.resumedAt == null);
}

export function dispatchGroups(state: MeshState) {
    const queue = state.requests.filter(request => ['Новая', 'Ожидает места'].includes(request.status));
    const groups = Object.groupBy(queue, request => request.kind === 'Робот'
        ? 'robot-' + request.from
        : 'hub-' + state.places.find(place => place.id === request.to)?.city);
    const availableRobots = ['R-01', 'R-02'].filter(robot => !activeTrips(state).some(trip => trip.robot === robot));

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
            availableRobots,
            title: isHub ? 'Поставка в ' + city : 'Рейс из ' + pointName(state, first.from),
            pickupOptions: offices.map(office => [office.id, office.name + ' · свободно ' + num(space(state, office.id).free) + ' л'] as const),
        }];
    });
}

export type DispatchGroup = ReturnType<typeof dispatchGroups>[number];

export function loadSummary(state: MeshState, requests: Shipment[], isHub: boolean) {
    const units = requests.reduce((total, request) => total + request.qty, 0);
    if (!units) return '';
    const base = 'Выбрано ' + units + ' шт. · ' + num(cargoLiters(state, requests)) + ' л';
    if (isHub) return base;
    const range = units < rover.minUnits ? 'недостаточно упаковок'
        : units < rover.idealMin ? 'ниже рекомендуемой загрузки'
        : units > rover.idealMax ? 'выше рекомендуемой загрузки' : 'рекомендуемая загрузка';
    return base + ' из ' + num(rover.liters) + ' л · ' + num(loadKg(state, requests)) + ' из ' +
        rover.maxKg + ' кг · ' + range + ' · рейс ' + rub(360 / units) + '/шт. · хаб 80 ₽/шт.';
}
