import { useState } from 'react';
import type { Place } from '../types';

export function usePickupPoint(places: Place[], key: string, fallback: string) {
    const [selected, setSelected] = useState(() => sessionStorage.getItem(key) ?? fallback);
    const point = places.find(place => place.id === selected) ?? places[0];

    function select(id: string) {
        sessionStorage.setItem(key, id);
        setSelected(id);
    }

    return [point, select] as const;
}
