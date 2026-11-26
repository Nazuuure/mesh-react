import { useState } from 'react';
import { pilotDefaults, pilotReport } from '../functions/pilot';
import type { PilotField } from '../functions/pilot';

export function usePilotScenario() {
    const [fields, setFields] = useState(pilotDefaults);

    function change(field: PilotField, value: number) {
        setFields(current => ({ ...current, [field]: value }));
    }

    return { fields, change, report: pilotReport(fields) };
}
