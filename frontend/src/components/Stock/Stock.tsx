import { num } from '../../functions/format';
import { stockReport } from '../../functions/reports';
import type { MeshState } from '../../types';
import { Entry } from '../Entry/Entry';

export function Stock({ state, office }: { state: MeshState; office?: string }) {
    const items = stockReport(state, office);
    if (!items.length) return <p>Полка пока пуста</p>;

    return items.map(({ item, details }) => (
        <Entry key={item.id}>
            <strong>{item.name}</strong> <small>· {item.dims.map(num).join(' × ')} см · {num(item.liters)} л</small><br />
            {details}
        </Entry>
    ));
}
