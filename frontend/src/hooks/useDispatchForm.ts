import { useState } from 'react';
import type { FormEvent } from 'react';
import { formValue } from '../functions/format';
import { loadSummary } from '../functions/logistics';
import type { DispatchGroup } from '../functions/logistics';
import type { MeshState, SendAction } from '../types';

export function useDispatchForm(state: MeshState, group: DispatchGroup, send: SendAction, notify: (message: string) => void) {
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
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const fallback = submitter?.getAttribute('name') === 'fallback';
        const type = group.isHub ? 'offer' : fallback ? 'viaHub' : 'trip';
        const complete = await send({
            type,
            ids: requests.map(request => request.id),
            purpose: formValue(form, 'purpose'),
            place: formValue(form, 'place'),
            robot: formValue(form, 'robot'),
        });
        if (complete) setSelected([]);
    }

    return { selected, select, submit, summary: loadSummary(state, requests, group.isHub) };
}
