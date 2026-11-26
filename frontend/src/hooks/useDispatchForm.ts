import { useState } from 'react';
import { rover } from '../../../model.mjs';
import type { FormEvent } from 'react';
import { formValue } from '../functions/format';
import { loadSummary } from '../functions/logistics';
import type { DispatchGroup } from '../functions/logistics';
import type { MeshState, SendAction } from '../types';
import { useServerClock } from './useServerClock';

export function useDispatchForm(state: MeshState, group: DispatchGroup, send: SendAction, notify: (message: string) => void, offset: number) {
    const now = useServerClock(offset);
    const [selected, setSelected] = useState<number[]>([]);
    const requests = group.requests.filter(request => selected.includes(request.id));

    function select(id: number, checked: boolean) {
        setSelected(current => checked ? [...current, id] : current.filter(value => value !== id));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!requests.length) {
            notify('Отметьте заявки для отправки');
            return;
        }

        const form = new FormData(event.currentTarget);
        const type = group.isHub ? 'offer' : 'viaHub';
        const complete = await send({
            type,
            ids: requests.map(request => request.id),
            purpose: formValue(form, 'purpose'),
            place: formValue(form, 'place'),
        });
        if (complete) setSelected([]);
    }

    const window = state.dispatchWindows?.[group.requests[0].from];
    const seconds = window ? Math.max(0, Math.ceil((window.since + rover.collectMilliseconds - now) / 1000)) : null;
    return { selected, select, submit, window, seconds, summary: loadSummary(state, requests, group.isHub, now) };
}
