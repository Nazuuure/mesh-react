import { space } from '../../../model.mjs';
import { formValue, pickupPoints } from '../functions/format';
import { officeQueues } from '../functions/logistics';
import type { MeshState, SendAction } from '../types';
import { useFormAction } from './useFormAction';
import { usePickupPoint } from './usePickupPoint';

export function usePvz(state: MeshState, send: SendAction) {
    const points = pickupPoints(state);
    const [point, select] = usePickupPoint(points, 'pvz-office', 'p1');
    const capacity = useFormAction(send, form => ({
        type: 'capacity',
        place: point.id,
        value: formValue(form, 'value'),
    }));
    return { points, point, select, capacity, volume: space(state, point.id), queues: officeQueues(state, point.id) };
}
