import { rover } from '../../../../model.mjs';
import { itemName, pointName } from '../../functions/format';
import type { DispatchGroup } from '../../functions/logistics';
import { useDispatchForm } from '../../hooks/useDispatchForm';
import shared from '../../styles/Shared.module.css';
import type { CabinetProps, Option } from '../../types';
import { Button } from '../Button/Button';
import { Entry } from '../Entry/Entry';
import { SelectField } from '../SelectField/SelectField';
import styles from './DispatchForm.module.css';

const purposes: Option[] = [
    ['auto', 'По заявкам'],
    ['storage', 'На хранение'],
    ['pickup', 'На выдачу по заказу'],
];

interface Props extends Pick<CabinetProps, 'state' | 'send' | 'busy' | 'offset'> {
    group: DispatchGroup;
    notify: (message: string) => void;
}

export function DispatchForm({ state, send, busy, group, notify, offset }: Props) {
    const form = useDispatchForm(state, group, send, notify, offset);
    return (
        <Entry>
            <form onSubmit={form.submit}>
                <h3>{group.title}</h3>
                {group.requests.map(request => (
                    <label className={styles.checkbox} key={request.id}>
                        <input type="checkbox" checked={form.selected.includes(request.id)}
                            onChange={event => form.select(request.id, event.target.checked)} />
                        <span>
                            №{request.id} · {itemName(state, request.product)} × {request.qty} → {pointName(state, request.to)}
                            {' · '}{request.order ? 'заказ №' + request.order : 'сток продавца'}
                        </span>
                    </label>
                ))}
                {group.isHub ? (
                    <div className={shared.form}>
                        <SelectField label="Назначение" name="purpose" options={purposes} />
                        <SelectField label="Пункт приёмки" name="place"
                            options={[[ '', 'Подобрать по вместимости' ], ...group.pickupOptions]} />
                        <Button type="submit" primary disabled={busy}>Запросить приёмку</Button>
                    </div>
                ) : (
                    <>
                        <p>{form.window
                            ? 'В партии ' + form.window.units + ' уп. · ' + (form.seconds ? 'сбор ещё ' + form.seconds + ' с' : 'ожидает назначения ровера')
                            : 'Автосбор совместимой партии от ' + rover.autoUnits + ' упаковок'}</p>
                        <Button type="submit" disabled={busy || !form.selected.length}>Отправить выбранное через хаб</Button>
                    </>
                )}
                {form.summary && <p className={shared.muted}>{form.summary}</p>}
            </form>
        </Entry>
    );
}
