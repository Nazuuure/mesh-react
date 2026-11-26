import { Fragment } from 'react';
import { pointName } from '../../functions/format';
import { courierStatus } from '../../functions/logistics';
import { cityRoutes } from '../../functions/map';
import { useServerClock } from '../../hooks/useServerClock';
import type { MeshState } from '../../types';
import { CityMap } from '../CityMap/CityMap';
import { Entry } from '../Entry/Entry';
import { Panel } from '../Panel/Panel';

export function RouteMap({ state, office, offset }: { state: MeshState; office?: string; offset: number }) {
    const now = useServerClock(offset);
    const cities = cityRoutes(state, office, now);

    return (
        <Panel title="Карта рейсов роверов">
            {cities.map(({ city, points, routes }) => (
                <Fragment key={city}>
                    <CityMap points={points} city={city} caption="Расчётные маршруты роверов"
                        background={routes.map(({ trip, stops, color }) => (
                            <polyline key={trip.id} points={stops.map(([x, y]) => x + ',' + y).join(' ')}
                                fill="none" stroke={color} strokeWidth="4" strokeDasharray="8 3" />
                        ))}>
                        {routes.map(({ trip, x, y, color }) => (
                            <circle key={trip.id} data-rover={trip.robot} cx={x} cy={y} r="8" fill={color} stroke="white" strokeWidth="2">
                                <title>{trip.robot}</title>
                            </circle>
                        ))}
                    </CityMap>
                    <small>{routes.length ? 'Пунктир — маршрут, точка — расчётное положение ровера.' : 'Активных рейсов нет'}</small>
                    {routes.map(({ trip, paused, units }) => (
                        <Entry key={trip.id}>
                            <strong>{trip.robot} · рейс №{trip.id}</strong> · {paused ? (office ? 'Рейс приостановлен' : courierStatus(trip) === 'needed' ? 'Застрял · требуется помощь' : 'Застрял · курьер отправлен') : trip.status}<br />
                            {trip.route.map(id => pointName(state, id)).join(' → ')} · {units} уп.
                        </Entry>
                    ))}
                </Fragment>
            ))}
        </Panel>
    );
}
