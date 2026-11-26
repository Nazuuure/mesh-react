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
                <div className={shared.form}>
                    <SelectField label="Назначение" name="purpose" options={purposes} />
                    {group.isHub ? (
                        <SelectField label="Пункт приёмки" name="place"
                            options={[[ '', 'Подобрать по вместимости' ], ...group.pickupOptions]} />
                    ) : (
                        <SelectField label="Свободный робот" name="robot"
                            options={group.availableRobots.map(robot => [robot, robot])} />
                    )}
                    <Button type="submit" primary disabled={busy || (!group.isHub && !group.availableRobots.length)}>
                        {group.isHub ? 'Запросить приёмку' : 'Построить маршрут и начать погрузку'}
                    </Button>
                    {!group.isHub && <Button type="submit" name="fallback" disabled={busy}>Отправить через хаб</Button>}
                </div>
                {form.summary && <p className={shared.muted}>{form.summary}</p>}
            </form>
        </Entry>
    );
}
