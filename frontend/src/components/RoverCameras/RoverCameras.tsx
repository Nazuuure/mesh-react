import { activeTrips, visitsOffice } from '../../functions/logistics';
import type { MeshState } from '../../types';
import { Entry } from '../Entry/Entry';
import { Panel } from '../Panel/Panel';
import styles from './RoverCameras.module.css';

export function RoverCameras({ state, office }: { state: MeshState; office: string }) {
    const trips = activeTrips(state).filter(trip => visitsOffice(trip, office));

    return (
        <Panel title="Камера ровера">
            {trips.length ? trips.map(trip => {
                const url = state.cameraUrls?.[trip.robot];
                return (
                    <Entry key={trip.id}>
                        <strong>{trip.robot} · рейс №{trip.id}</strong>
                        {url ? <video className={styles.camera} controls muted playsInline preload="none" src={url} />
                            : <p>Видеопоток не подключён</p>}
                    </Entry>
                );
            }) : <p>У выбранного ПВЗ сейчас нет активного рейса.</p>}
        </Panel>
    );
}
