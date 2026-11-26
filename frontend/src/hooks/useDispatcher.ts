import { activeTrips, dispatchGroups } from '../functions/logistics';
import type { MeshState, SendAction } from '../types';

export function useDispatcher(state: MeshState, send: SendAction) {
    const active = new Set(activeTrips(state).map(trip => trip.id));

    function reset() {
        if (window.confirm('Заменить текущие заказы и остатки демонстрационными данными?')) {
            void send({ type: 'reset' });
        }
    }

    return {
        groups: dispatchGroups(state),
        hubLoads: state.requests.filter(request => request.from === 'hub' && request.status === 'Погрузка'),
        trips: state.trips.toReversed(),
        history: state.requests.toReversed(),
        active,
        reset,
    };
}
