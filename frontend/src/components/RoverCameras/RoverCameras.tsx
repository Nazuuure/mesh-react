import { activeTrips } from '../../functions/logistics';
import type { MeshState } from '../../types';
import { Entry } from '../Entry/Entry';
import { Panel } from '../Panel/Panel';
import styles from './RoverCameras.module.css';

export function RoverCameras({ state }: { state: MeshState }) {
    const trips = activeTrips(state);

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
            }) : <p>Сейчас нет активных рейсов.</p>}
        </Panel>
    );
}
