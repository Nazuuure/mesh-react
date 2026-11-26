import { useState } from 'react';
import { packingLiters } from '../../../model.mjs';
import { formValue } from '../functions/format';
import type { SendAction } from '../types';
import { useFormAction } from './useFormAction';

const initialDimensions = ['10', '10', '20'];

export function useListingForm(send: SendAction, city: string) {
    const [dimensions, setDimensions] = useState(initialDimensions);
    let volume: string;
    try {
        volume = packingLiters(dimensions).toLocaleString('ru-RU', { maximumSignificantDigits: 8 }) + ' л';
    } catch {
        volume = 'Введите размеры';
    }

    const submit = useFormAction(send, form => ({
        type: 'product',
        name: formValue(form, 'name'),
        category: formValue(form, 'category'),
        price: formValue(form, 'price'),
        qty: formValue(form, 'qty'),
        city,
        weightKg: formValue(form, 'weightKg'),
        dims: dimensions,
    }));

    function changeDimension(index: number, value: string) {
        setDimensions(current => current.map((dimension, position) => position === index ? value : dimension));
    }

    return { dimensions, changeDimension, volume, submit };
}
