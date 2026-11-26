import { demandStats, heatCircles } from '../../functions/map';
import type { MeshState } from '../../types';
import { CityMap } from '../CityMap/CityMap';
import styles from './DemandMap.module.css';

export function DemandMap({ state, city, category }: { state: MeshState; city: string; category: string }) {
    const points = state.places.filter(point => point.id !== 'hub' && point.city === city);
    const rows = demandStats(state, points, category);

    return (
        <>
            <CityMap points={points} city={city} caption="Спрос по пунктам выдачи"
                background={heatCircles(rows).map(circle => (
                    <circle key={circle.id} cx={circle.x} cy={circle.y} r={circle.radius} fill="#cc3880" opacity={circle.opacity} />
                ))} />
            <small>Чем больше и темнее пятно, тем больше заказов в выбранной категории.</small>
            <div className={styles.scroller}>
                <table className={styles.table}>
                    <thead><tr><th>Пункт</th><th>Демоистория</th><th>Новые заказы</th><th>Всего</th></tr></thead>
                    <tbody>
                        {rows.map(({ point, history, recent, count }) => (
                            <tr key={point.id}><th scope="row">{point.name}</th><td>{history}</td><td>{recent}</td><td>{count}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
