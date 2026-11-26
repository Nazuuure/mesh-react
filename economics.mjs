export const rates = Object.freeze({
    storagePerLiterDay: 0.5,
    handling: 10,
    pickup: 12,
    hubTransport: 80,
    roverTrip: 360,
    returnHandling: 15,
    courier: 60,
    hubWaitSeconds: 15,
    handlingSeconds: 10,
});

export const travelSeconds = (roverStop = 0) => roverStop ? 10 * roverStop : 25;

export function routeCosts({ units, literDays, transport, returns = 0, failed = 0, assistance = 0 }) {
    const storage = literDays * rates.storagePerLiterDay;
    const handling = units * rates.handling;
    const pickup = units * rates.pickup;
    const returnCost = returns * rates.returnHandling;
    return {
        storage,
        handling,
        transport,
        pickup,
        returnCost,
        failed,
        assistance,
        total: storage + handling + transport + pickup + returnCost + failed + assistance,
    };
}

export function compareRoutes({ units, liters, meshDays, hubDays, meshWait, hubWait,
    stops, returns, failedTrips, courierCalls, recoverySeconds, deadline }) {
    const mesh = routeCosts({
        units,
        literDays: liters * meshDays,
        transport: rates.roverTrip,
        returns,
        failed: failedTrips * rates.roverTrip,
        assistance: courierCalls * rates.courier,
    });
    const hub = routeCosts({ units, literDays: liters * hubDays, transport: units * rates.hubTransport, returns });
    const meshSeconds = meshWait + rates.handlingSeconds + travelSeconds(stops) + recoverySeconds;
    const hubSeconds = hubWait + rates.handlingSeconds + travelSeconds();
    const saving = hub.total - mesh.total;
    const meshOnTime = meshSeconds <= deadline;
    const hubOnTime = hubSeconds <= deadline;
    let recommendation = 'neither';
    if (meshOnTime && (!hubOnTime || saving > 0)) recommendation = 'mesh';
    else if (hubOnTime) recommendation = 'hub';

    return { mesh, hub, meshSeconds, hubSeconds, saving, recommendation };
}

export function ledgerComparison({ storage, transport, returned = false, failed = 0, assistance = 0 }) {
    const scenario = { units: 1, literDays: storage / rates.storagePerLiterDay, returns: Number(returned) };
    const mesh = routeCosts({ ...scenario, transport, failed, assistance });
    const hub = routeCosts({ ...scenario, transport: rates.hubTransport });
    return { mesh, hub, saving: hub.total - mesh.total };
}

export function profitBoundary({ units, unitLiters, meshDays, hubDays, failedTrips, courierCalls }) {
    const fixed = rates.roverTrip * (1 + failedTrips) + rates.courier * courierCalls;
    const storagePerUnit = unitLiters * rates.storagePerLiterDay;
    const advantage = rates.hubTransport + (hubDays - meshDays) * storagePerUnit;
    const minimumUnits = advantage > 0 ? Math.floor((fixed + 1e-8) / advantage) + 1 : null;
    const meshStorageDays = hubDays + (units * rates.hubTransport - fixed) / (units * storagePerUnit);
    return { minimumUnits, meshStorageDays };
}
