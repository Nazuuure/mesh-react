import { categories } from '../../../../model.mjs';
import { useListingForm } from '../../hooks/useListingForm';
import shared from '../../styles/Shared.module.css';
import type { SendAction } from '../../types';
import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import fieldStyles from '../Field/Field.module.css';
import { SelectField } from '../SelectField/SelectField';

const dimensions = ['Длина, см', 'Ширина, см', 'Высота, см'];

export function ListingForm({ city, send, busy }: { city: string; send: SendAction; busy: boolean }) {
    const form = useListingForm(send, city);
    return (
        <form className={shared.form} onSubmit={form.submit}>
            <Field label="Название" name="name" required maxLength={80} placeholder="Например, колонка" />
            <SelectField label="Категория" name="category" options={categories.map(category => [category, category])} />
            <Field label="Цена, ₽" name="price" type="number" defaultValue={990} min={0.01} step="any" required />
            {dimensions.map((label, index) => (
                <Field key={label} label={label} type="number" min={0.01} step="any" required value={form.dimensions[index]}
                    onChange={event => form.changeDimension(index, event.target.value)} />
            ))}
            <label className={fieldStyles.field}>Объём упаковки<output>{form.volume}</output></label>
            <Field label="Масса упаковки, кг" name="weightKg" type="number" defaultValue={1} min={0.001} step="any" required />
            <Field label="Количество, шт." name="qty" type="number" defaultValue={3} min={1} required />
            <Button type="submit" primary disabled={busy}>Добавить товар</Button>
        </form>
    );
}
