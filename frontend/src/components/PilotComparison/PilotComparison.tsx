import { rates } from '../../../../economics.mjs';
import type { RouteCosts } from '../../../../economics.mjs';
import { num, rub } from '../../functions/format';
import type { PilotField } from '../../functions/pilot';
import { usePilotScenario } from '../../hooks/usePilotScenario';
import { Field } from '../Field/Field';
import { Panel } from '../Panel/Panel';
import styles from './PilotComparison.module.css';

const fields: { name: PilotField; label: string; min: number; step?: string }[] = [
    { name: 'units', label: 'Заказов в партии', min: 1 },
    { name: 'unitLiters', label: 'Объём упаковки, л', min: 0.01, step: 'any' },
    { name: 'unitKg', label: 'Масса упаковки, кг', min: 0.001, step: 'any' },
    { name: 'meshDays', label: 'Хранение Mesh, дней', min: 0, step: 'any' },
    { name: 'hubDays', label: 'Хранение через хаб, дней', min: 0, step: 'any' },
    { name: 'meshWait', label: 'Комплектация рейса Mesh, с', min: 0 },
    { name: 'hubWait', label: 'Ожидание отгрузки с хаба, с', min: 0 },
    { name: 'stops', label: 'Номер остановки ровера', min: 1 },
    { name: 'deadline', label: 'Предельный срок до готовности, с', min: 0 },
    { name: 'returns', label: 'Возвратов в партии', min: 0 },
    { name: 'failedTrips', label: 'Неудачных рейсов Mesh', min: 0 },
    { name: 'courierCalls', label: 'Вызовов курьера', min: 0 },
    { name: 'recoverySeconds', label: 'Задержка из-за сбоев Mesh, с', min: 0 },
];

const categories: [keyof RouteCosts, string][] = [
    ['storage', 'Хранение'],
    ['handling', 'Обработка'],
    ['transport', 'Перевозка'],
    ['pickup', 'Выдача'],
    ['returnCost', 'Возвраты'],
    ['failed', 'Неудачные рейсы'],
    ['assistance', 'Помощь курьера'],
    ['total', 'Итого за партию'],
];

export function PilotComparison() {
    const { fields: values, change, report } = usePilotScenario();

    return (
        <Panel title="Сравнение Mesh и хаба">
            <p>Одна партия одинаковых заказов, по одной упаковке на заказ. Тарифы и время учебные.</p>
            <div className={styles.fields}>
                {fields.map(({ name, label, min, step }) => (
                    <Field key={name} label={label} type="number" min={min} step={step ?? '1'}
                        value={Number.isNaN(values[name]) ? '' : values[name]}
                        onChange={event => change(name, event.target.valueAsNumber)} />
                ))}
            </div>
            {report ? (
                <>
                    <p><strong>{report.decision}</strong>{report.limit && ' · ' + report.limit}</p>
                    <p>
                        {report.threshold != null && report.threshold <= report.maxUnits
                            ? <>Ровер дешевле от <strong>{num(report.threshold)} упаковок</strong> при этих тарифах и сроках хранения. Срок доставки проверяется отдельно.</>
                            : 'При этих параметрах один рейс ровера не окупается в пределах его вместимости.'}
                    </p>
                    <div className={styles.scroller}>
                        <table className={styles.table}>
                            <thead><tr><th scope="col">Затраты и срок</th><th scope="col">Mesh</th><th scope="col">Хаб</th></tr></thead>
                            <tbody>
                                {categories.map(([key, label]) => (
                                    <tr key={key}><th scope="row">{label}</th>
                                        <td>{report.limit ? '—' : rub(report.result.mesh[key])}</td>
                                        <td>{rub(report.result.hub[key])}</td></tr>
                                ))}
                                <tr><th scope="row">До готовности с ожиданием</th>
                                    <td>{report.limit ? '—' : num(report.result.meshSeconds) + ' с'}</td>
                                    <td>{num(report.result.hubSeconds)} с</td></tr>
                            </tbody>
                        </table>
                    </div>
                    {!report.limit && <p>Экономия Mesh на заказ · <strong>{rub(report.result.saving / values.units)}</strong></p>}
                    {!report.limit && (
                        <p>{report.boundary.meshStorageDays > 0
                            ? 'При таком размере партии Mesh дешевле при хранении менее ' + num(report.boundary.meshStorageDays) + ' дней.'
                            : 'При таком размере партии ровер дороже даже без хранения Mesh.'}</p>
                    )}
                    <details className={styles.details}>
                        <summary>Как влияет загрузка ровера</summary>
                        <p>Экономия на заказ при выбранных сроках хранения, без сбоев и возвратов.</p>
                        <ul>
                            {report.sensitivity.map(row => (
                                <li key={row.units}>{row.units} уп. · {row.limit || rub(row.saving)}</li>
                            ))}
                        </ul>
                    </details>
                </>
            ) : <p role="status">Заполните параметры. Число возвратов и остановок ограничено размером партии.</p>}
            <details className={styles.details}>
                <summary>Тарифы и допущения</summary>
                <p>Хранение {rub(rates.storagePerLiterDay)}/л·день, обработка {rub(rates.handling)}, выдача {rub(rates.pickup)},
                    рейс ровера {rub(rates.roverTrip)}, перевозка через хаб {rub(rates.hubTransport)}/уп.,
                    возврат {rub(rates.returnHandling)}, выезд курьера {rub(rates.courier)}.
                    В срок включено {rates.handlingSeconds} с на обработку и приёмку.</p>
            </details>
        </Panel>
    );
}
