import { demandAt, routePosition } from '../../../model.mjs';
import type { MeshState, Place, Stop, Trip } from '../types';
import { pickupPoints } from './format';
import { activeTrips } from './logistics';

export const mapPoint = (place: Place): [number, number] => [60 + place.x * 89, 22 + place.y * 48];

function timedStops(state: MeshState, trip: Trip): Stop[] {
    const requests = state.requests.filter(request => trip.ids.includes(request.id));
    return trip.route.flatMap((id, index) => {
        const place = state.places.find(point => point.id === id);
        const time = index ? requests.find(request => request.target === id)?.eta : requests[0]?.sentAt;
        return place ? [[...mapPoint(place), time ?? 0] as Stop] : [];
    });
}

export function cityRoutes(state: MeshState, office: string | undefined, now: number) {
    const points = pickupPoints(state);
    const cities = [...new Set(points.filter(point => !office || point.id === office).map(point => point.city))];
    const trips = activeTrips(state).filter(trip => !office || trip.route.includes(office));

    return cities.map(city => {
        const local = points.filter(point => point.city === city);
        const routes = trips.filter(trip => local.some(point => point.id === trip.route[0])).flatMap(trip => {
            const stops = timedStops(state, trip);
            if (!stops.length) return [];
            const pausedAt = trip.incident?.resumedAt == null ? trip.incident?.at : undefined;
            const { x, y } = routePosition(stops, pausedAt ?? now);
            const color = trip.robot === 'R-01' ? '#753aaa' : '#137d77';
            const units = state.requests.filter(row => trip.ids.includes(row.id)).reduce((sum, row) => sum + row.qty, 0);

            return [{ trip, stops, paused: pausedAt !== undefined, x, y, color, units }];
        });
        return { city, points: local, routes };
    });
}

export function demandStats(state: MeshState, points: Place[], category: string) {
    return points.map(point => {
        const { history, orders, count } = demandAt(state, point.id, category);
        return { point, history, recent: orders, count };
    }).toSorted((left, right) => right.count - left.count);
}

export function heatCircles(rows: ReturnType<typeof demandStats>) {
    return rows.flatMap(({ point, count }) => {
        const [x, y] = mapPoint(point);
        const intensity = count / (count + 15);
        return [1, 0.72, 0.44].map(scale => ({
            id: point.id + ':' + scale,
            x,
            y,
            radius: (16 + 42 * intensity) * scale,
            opacity: 0.07 + 0.23 * intensity,
        }));
    });
}
