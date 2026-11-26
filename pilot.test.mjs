import assert from 'node:assert/strict';
import test from 'node:test';
import { compareRoutes, profitBoundary } from './economics.mjs';
import { apply, product, seed, space } from './model.mjs';

const scenario = {
    units: 8, unitLiters: 1, liters: 8, meshDays: 7, hubDays: 7,
    meshWait: 30, hubWait: 15, stops: 1, returns: 0, failedTrips: 0,
    courierCalls: 0, recoverySeconds: 0, deadline: 90,
};

test('Equal orders have comparable cost lines and a strict threshold for savings', () => {
    const result = compareRoutes(scenario);
    assert.deepEqual(result.mesh, {
        storage: 28, handling: 80, transport: 360, pickup: 96, returnCost: 0, failed: 0, assistance: 0, total: 564,
    });
    assert.equal(result.hub.total, 844);
    assert.equal(result.saving / scenario.units, 35);
    assert.equal(result.meshSeconds, 50);
    assert.equal(result.hubSeconds, 50);
    assert.equal(result.recommendation, 'mesh');
    assert.deepEqual(profitBoundary(scenario), { minimumUnits: 5, meshStorageDays: 77 });

    const small = compareRoutes({ ...scenario, units: 3, liters: 3 });
    assert.equal(small.saving / 3, -40);
    assert.equal(small.recommendation, 'hub');
    assert.equal(compareRoutes({ ...scenario, meshWait: 100 }).recommendation, 'hub');
    assert.equal(compareRoutes({ ...scenario, deadline: 40 }).recommendation, 'neither');
    assert.equal(compareRoutes({ ...scenario, meshDays: 77 }).saving, 0);
    assert.equal(profitBoundary({ ...scenario, meshDays: 200 }).minimumUnits, null);
    assert.equal(profitBoundary({ ...scenario, units: 9, unitLiters: 1, meshDays: 87 }).minimumUnits, 10);
});

test('Returns, failed trips, and resumption appear as distinct cost and time lines', () => {
    const result = compareRoutes({ ...scenario, meshDays: 30, returns: 2, failedTrips: 1, courierCalls: 1, recoverySeconds: 30 });
    assert.equal(result.mesh.storage - result.hub.storage, 92);
    assert.equal(result.mesh.returnCost, 30);
    assert.equal(result.hub.returnCost, 30);
    assert.equal(result.mesh.failed, 360);
    assert.equal(result.mesh.assistance, 60);
    assert.equal(result.saving, -232);
    assert.equal(result.meshSeconds, 80);
    assert.equal(result.recommendation, 'hub');
    assert.equal(profitBoundary({ ...scenario, courierCalls: 1 }).minimumUnits, 6);
    assert.equal(profitBoundary({ ...scenario, failedTrips: 1, courierCalls: 1 }).minimumUnits, 10);
});

function checkout(state, productId, destination, time = 1000) {
    apply(state, { type: 'order', product: productId, to: destination }, time);
    return state.orders.at(-1);
}

function issue(state, order) {
    apply(state, { type: 'issue', order: order.id, place: order.loc });
    return state.ledger.at(-1);
}

test('Replenished stock uses its own arrival day and FIFO at each pickup office', () => {
    const state = seed();
    state.day = 100;
    apply(state, { type: 'restock', product: 2, place: 'p1', qty: 1 });
    assert.equal(issue(state, checkout(state, 2, 'p1')).storage, 0);

    apply(state, { type: 'restock', product: 2, place: 'p1', qty: 1 });
    state.day = 104;
    apply(state, { type: 'restock', product: 2, place: 'p1', qty: 1 });
    state.day = 106;
    assert.equal(issue(state, checkout(state, 2, 'p1')).storage, 3);
    const fresh = checkout(state, 2, 'p1');
    assert.equal(issue(state, fresh).storage, 1);
    apply(state, { type: 'return', order: fresh.id, place: 'p1' });
    assert.equal(issue(state, checkout(state, 2, 'p1')).storage, 0);
    assert.equal(product(state, 2).stock.p2, 12);
});

test('Stock transfers preserve FIFO and count only days spent in storage', () => {
    const state = seed();
    apply(state, { type: 'product', name: 'Партия', place: 'p2', category: 'Дом', qty: 1, price: 100, dims: [10, 10, 10] });
    const item = state.products.at(-1);
    state.day = 9;
    apply(state, { type: 'restock', product: item.id, place: 'p2', qty: 1 });
    apply(state, { type: 'transfer', product: item.id, place: 'p2', to: 'p1', qty: 2 });
    const shipment = state.requests.at(-1);
    apply(state, { type: 'viaHub', ids: [shipment.id] });
    apply(state, { type: 'offer', ids: [shipment.id], place: 'p1' });
    apply(state, { type: 'reply', batch: shipment.batch, place: 'p1', accept: true });
    state.day = 11;
    apply(state, { type: 'ship', request: shipment.id, place: 'p2' }, 2000);
    state.day = 13;
    apply(state, { type: 'receive', request: shipment.id, place: 'p1' }, shipment.eta);
    state.day = 15;
    assert.equal(issue(state, checkout(state, item.id, 'p1')).storage, 3);
    assert.equal(issue(state, checkout(state, item.id, 'p1')).storage, 2);
});

test('A specific parcel in the pickup area incurs no extra shelf days and retains its own history', () => {
    const state = seed();
    const item = product(state, 2);
    const order = checkout(state, item.id, 'p1');
    apply(state, { type: 'choice', order: order.id, accept: false }, 1500);
    const shipment = state.requests.at(-1);
    apply(state, { type: 'viaHub', ids: [shipment.id] });
    apply(state, { type: 'offer', ids: [shipment.id], place: 'p1' });
    apply(state, { type: 'reply', batch: shipment.batch, place: 'p1', accept: true });
    state.day = 8;
    apply(state, { type: 'ship', request: shipment.id, place: 'p2' }, 6000);
    apply(state, { type: 'restock', product: item.id, place: 'p1', qty: 1 });
    state.day = 9;
    apply(state, { type: 'receive', request: shipment.id, place: 'p1' }, shipment.eta);
    assert.equal(space(state, 'p1').pickup, 1);
    state.day = 20;
    const entry = issue(state, order);
    assert.equal(entry.storage, 4);
    assert.equal(entry.elapsed, 30);
    assert.equal(entry.waiting, 5);
    assert.equal(space(state, 'p1').pickup, 0);
    assert.equal(issue(state, checkout(state, item.id, 'p1')).storage, 6);
});

test('A failed rover charges only the departed attempt and assigns courier cost once', () => {
    const state = seed();
    const order = checkout(state, 2, 'p1');
    apply(state, { type: 'choice', order: order.id, accept: false }, 1500);
    const shipment = state.requests.at(-1);
    apply(state, { type: 'transfer', product: 2, place: 'p2', to: 'p1', qty: 7 });
    const ids = state.requests.map(request => request.id);
    apply(state, { type: 'trip', ids, robot: 'R-01' });
    apply(state, { type: 'failure', trip: state.trips.at(-1).id });
    assert.equal(order.failedTransport, undefined);
    apply(state, { type: 'trip', ids, robot: 'R-01' });
    const trip = state.trips.at(-1);
    apply(state, { type: 'ship', request: shipment.id, place: 'p2' }, 5000);
    apply(state, { type: 'stuck', trip: trip.id }, 6000);
    assert.throws(() => apply(state, { type: 'stuck', trip: trip.id }, 6500));
    apply(state, { type: 'rescue', trip: trip.id, place: trip.incident.office }, 7000);
    apply(state, { type: 'failure', trip: trip.id }, 7500);
    assert.equal(trip.failedTransport, 360);
    assert.equal(trip.assistanceCost, 60);
    assert.equal(product(state, 2).stock.p2, 12);

    apply(state, { type: 'viaHub', ids: [shipment.id] });
    apply(state, { type: 'offer', ids: [shipment.id], place: 'p1' });
    apply(state, { type: 'reply', batch: shipment.batch, place: 'p1', accept: true });
    apply(state, { type: 'ship', request: shipment.id, place: 'p2' }, 10000);
    apply(state, { type: 'receive', request: shipment.id, place: 'p1' }, shipment.eta);
    const entry = issue(state, order);
    assert.equal(entry.comparison.mesh.transport, 80);
    assert.equal(entry.comparison.mesh.failed, 45);
    assert.equal(entry.comparison.mesh.assistance, 7.5);
    assert.equal(entry.saving, -52.5);
    assert.equal(entry.elapsed, 34);
    assert.equal(entry.waiting, 4);
    apply(state, { type: 'return', order: order.id, place: 'p1' });
    assert.equal(entry.comparison.mesh.returnCost, 15);
    assert.equal(entry.comparison.hub.returnCost, 15);
    assert.equal(entry.saving, -52.5);
});

test('Legacy shipments keep stock consistent when their first receipt uses the new accounting', () => {
    const state = seed();
    const order = checkout(state, 3, 'p1');
    const shipment = state.requests.at(-1);
    apply(state, { type: 'offer', ids: [shipment.id], place: 'p1' });
    apply(state, { type: 'reply', batch: shipment.batch, place: 'p1', accept: true });
    apply(state, { type: 'ship', request: shipment.id, place: 'hub' }, 2000);
    delete shipment.cargo;
    delete product(state, 3).lots;
    const legacy = JSON.parse(JSON.stringify(state));
    apply(legacy, { type: 'receive', request: shipment.id, place: 'p1' }, shipment.eta);
    const entry = issue(legacy, legacy.orders.find(row => row.id === order.id));
    assert.equal(product(legacy, 3).stock.hub, 11);
    assert.equal(product(legacy, 3).stock.p1, 0);
    assert.equal(entry.storage, 28);
    assert.equal(entry.saving, 0);
});
