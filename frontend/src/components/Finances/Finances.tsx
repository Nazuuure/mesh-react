import { financeReport } from '../../functions/reports';
import type { MeshState } from '../../types';
import { Entry } from '../Entry/Entry';

export function Finances({ state, role, office }: { state: MeshState; role: 'pvz' | 'seller' | 'wb'; office?: string }) {
    const ledger = financeReport(state, role, office);
    if (!ledger.length) return <p>Расчёт появится после выдачи первого заказа</p>;

    return ledger.map(({ id, heading, details, returned }) => (
        <Entry key={id}>
            <strong>Заказ №{id} · {heading}</strong><br />
            <small>{details}{returned && ' · возврат'}</small>
        </Entry>
    ));
}
