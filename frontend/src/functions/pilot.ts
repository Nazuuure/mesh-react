import { compareRoutes, profitBoundary, rates } from '../../../economics.mjs';
import type { RouteScenario } from '../../../economics.mjs';
import { rover } from '../../../model.mjs';

export const pilotDefaults = {
    units: 8,
    unitLiters: 1,
    unitKg: 1,
    meshDays: 7,
    hubDays: 7,
    meshWait: 30,
    hubWait: rates.hubWaitSeconds,
    stops: 1,
    returns: 0,
    failedTrips: 0,
    courierCalls: 0,
    recoverySeconds: 0,
    deadline: 90,
};

export const routeLabels = {
    mesh: 'Рекомендуем ровер',
    hub: 'Рекомендуем хаб',
    neither: 'Пересмотрите срок или маршрут',
};

export type PilotFields = typeof pilotDefaults;
export type PilotField = keyof PilotFields;

export function roverLimit(units: number, liters: number, kilograms: number) {
    if (units < rover.minUnits) return 'Нужно минимум ' + rover.minUnits + ' упаковки';
    if (liters > rover.liters + 1e-8) return 'Больше ' + rover.liters + ' л на рейс';
    if (kilograms > rover.maxKg + 1e-8) return 'Тяжелее ' + rover.maxKg + ' кг на рейс';
    return '';
}

export function pilotReport(fields: PilotFields) {
    const { units, unitLiters, unitKg, returns, stops } = fields;
    if (Object.values(fields).some(value => !Number.isFinite(value) || value < 0)
        || [units, returns, stops, fields.failedTrips, fields.courierCalls].some(value => !Number.isSafeInteger(value))
        || units < 1 || unitLiters <= 0 || unitKg <= 0 || returns > units || stops < 1 || stops > units) {
        return null;
    }

    const scenario: RouteScenario = { ...fields, liters: units * unitLiters };
    const result = compareRoutes(scenario);
    if (!Number.isFinite(result.mesh.total) || !Number.isFinite(result.hub.total)) return null;

    const limit = roverLimit(units, scenario.liters, units * unitKg);
    const recommendation = limit ? (result.hubSeconds <= fields.deadline ? 'hub' : 'neither') : result.recommendation;
    const boundary = profitBoundary(fields);
    const maxUnits = Math.floor(Math.min(rover.liters / unitLiters, rover.maxKg / unitKg));
    const threshold = boundary.minimumUnits == null ? null : Math.max(rover.minUnits, stops, boundary.minimumUnits);

    const sensitivity = [3, 5, 8, 14].map(amount => {
        const comparison = compareRoutes({
            ...scenario, units: amount, liters: amount * unitLiters, returns: 0,
            failedTrips: 0, courierCalls: 0, recoverySeconds: 0,
        });
        return {
            units: amount,
            saving: comparison.saving / amount,
            limit: amount < stops ? 'Меньше заказов, чем остановок' : roverLimit(amount, amount * unitLiters, amount * unitKg),
        };
    });

    return { result, limit, decision: routeLabels[recommendation], sensitivity, boundary, maxUnits, threshold };
}
