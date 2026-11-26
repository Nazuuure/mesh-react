export const rates: Readonly<{
    storagePerLiterDay: number;
    handling: number;
    pickup: number;
    hubTransport: number;
    roverTrip: number;
    returnHandling: number;
    courier: number;
    hubWaitSeconds: number;
    handlingSeconds: number;
}>;

export interface RouteCosts {
    storage: number;
    handling: number;
    transport: number;
    pickup: number;
    returnCost: number;
    failed: number;
    assistance: number;
    total: number;
}

export interface RouteScenario {
    units: number;
    liters: number;
    meshDays: number;
    hubDays: number;
    meshWait: number;
    hubWait: number;
    stops: number;
    returns: number;
    failedTrips: number;
    courierCalls: number;
    recoverySeconds: number;
    deadline: number;
}

export interface CostComparison {
    mesh: RouteCosts;
    hub: RouteCosts;
    saving: number;
}

export interface RouteComparison extends CostComparison {
    meshSeconds: number;
    hubSeconds: number;
    recommendation: 'mesh' | 'hub' | 'neither';
}

export function compareRoutes(scenario: RouteScenario): RouteComparison;

export function profitBoundary(scenario: {
    units: number;
    unitLiters: number;
    meshDays: number;
    hubDays: number;
    failedTrips: number;
    courierCalls: number;
}): { minimumUnits: number | null; meshStorageDays: number };
