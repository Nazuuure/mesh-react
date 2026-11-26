import assert from 'node:assert/strict';
import test from 'node:test';
import { compareRoutes, profitBoundary } from './economics.mjs';
import { apply, demandAt, freeStock, localKm, product, scheduleRovers, seed, space, syncGeography } from './model.mjs';

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
    assert.equal(order.assistanceCost, undefined);
    apply(state, { type: 'dispatchCourier', trip: trip.id }, 6600);
    apply(state, { type: 'rescue', trip: trip.id }, 7000);
    apply(state, { type: 'failure', trip: trip.id }, 7500);
    assert.equal(trip.awaitingCarrier,true);
    apply(state,{type:'confirmReturn',trip:trip.id},7501);
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

test('Automatic rover waits seven seconds from the sixth compatible unit and collects more', () => {
    const state = seed();
    const transfer = qty => apply(state, { type: 'transfer', product: 2, place: 'p2', to: 'p1', qty });
    transfer(5);
    assert.equal(scheduleRovers(state, 1000), false);
    transfer(1);
    assert.equal(scheduleRovers(state, 2000), true);
    assert.deepEqual(state.dispatchWindows.p2, { since: 2000, units: 6 });

    transfer(1);
    assert.equal(scheduleRovers(state, 5000), true);
    assert.equal(state.dispatchWindows.p2.since, 2000);
    assert.equal(state.dispatchWindows.p2.units, 7);
    assert.equal(scheduleRovers(state, 8999), false);
    assert.equal(state.trips.length, 0);
    assert.equal(scheduleRovers(state, 9000), true);
    const trip = state.trips[0];
    assert.equal(trip.status, 'Погрузка');
    assert.equal(trip.ids.length, 3);
    assert.equal(product(state, 2).stock.p2, 12);
    assert.equal(scheduleRovers(state, 12000), false);
    apply(state, { type: 'ship', request: trip.ids[0], place: 'p2' }, 12000);
    assert.equal(product(state, 2).stock.p2, 5);
    assert.equal(trip.status, 'В пути');
});

test('The scheduler leaves heavy cargo queued and waits for a free rover', () => {
    const state = seed();
    apply(state, { type: 'product', name: 'Тяжёлый груз', category: 'Дом', place: 'p2',
        dims: [10,10,10], qty: 6, weightKg: 10, price: 100 });
    const heavy = state.products.at(-1);
    apply(state, { type: 'transfer', product: heavy.id, place: 'p2', to: 'p1', qty: 6 });
    apply(state, { type: 'transfer', product: 2, place: 'p2', to: 'p1', qty: 6 });
    state.trips.push({ id: 1, robot: 'R-01', status: 'В пути' }, { id: 2, robot: 'R-02', status: 'В пути' });
    scheduleRovers(state, 1000);
    assert.equal(scheduleRovers(state, 8000), false);
    state.trips[0].status = 'Завершён';
    assert.equal(scheduleRovers(state, 8001), true);
    assert.equal(state.trips.at(-1).robot, 'R-01');
    assert.equal(state.requests[0].status, 'Новая');
    assert.equal(state.requests[1].status, 'Погрузка');
});

test('Seller destination follows category demand, city, capacity, and excludes the source', () => {
    const state = seed();
    for (const row of state.history.filter(row => row.category === 'Дом')) {
        row.count = { p1: 1, p2: 100, p3: 10, p4: 200, p5: 5 }[row.place];
    }
    apply(state, { type: 'capacity', place: 'p2', value: space(state, 'p2').used });
    const listed = apply(state, { type: 'product', name: 'Выбор по спросу', category: 'Дом',
        city: 'Йошкар-Ола', dims: [10,10,10], qty: 1, price: 100 });
    const item = state.products.at(-1);
    assert.match(listed, /Парковый/);
    assert.deepEqual(item.stock, { p3: 1 });
    apply(state, { type: 'restock', product: item.id, city: 'Йошкар-Ола', qty: 1 });
    assert.deepEqual(item.stock, { p3: 2 });
    apply(state, { type: 'transfer', product: item.id, place: 'p3', city: 'Йошкар-Ола', qty: 1 });
    assert.equal(state.requests.at(-1).to, 'p1');
    assert.throws(() => apply(state, { type: 'restock', product: item.id, city: 'Другой город', qty: 1 }), /Выберите город/);
});

test('Long city leg pools cargo for one profitable van and receives each shipment once', () => {
    const s = seed();
    const transfer = (product, qty) => apply(s, {type:'transfer', product, place:'p2', to:'p3', qty});
    transfer(2, 12);
    const first = s.requests.at(-1);
    assert.equal(scheduleRovers(s, 10000), false);
    assert.throws(() => apply(s,{type:'van',ids:[first.id]}), /Недостаточно упаковок/);
    transfer(s.products.find(item=>item.name==='Мышь Pixel').id, 2);
    const second = s.requests.at(-1);
    apply(s,{type:'van',ids:[first.id, second.id]});
    assert.equal(first.kind,'Газель');
    const km=localKm(s.places.find(p=>p.id==='p2'),s.places.find(p=>p.id==='p3'));
    assert.ok(Math.abs(first.cost+second.cost-Math.round((600+km*50)*100)/100)<1e-8);
    apply(s,{type:'ship',request:first.id,place:'p2'},1000);
    assert.equal(second.status,'В пути');
    for(const r of [first,second]) apply(s,{type:'receive',request:r.id,place:'p3'},r.eta);
    assert.equal(second.status,'Доставлено');
    assert.throws(()=>apply(s,{type:'receive',request:first.id,place:'p3'},first.eta));
});

test('Legacy points acquire symmetric distances and retain supplied coordinates',()=>{
    const s=seed();
    for(const p of s.places){delete p.distancesKm;delete p.lat;delete p.lon}
    assert.equal(syncGeography(s),true);
    assert.equal(syncGeography(s),false);
    for(const p of s.places)for(const q of s.places){
        assert.equal(localKm(p,q),localKm(q,p));
        assert.equal(localKm(p,q)===0,p.id===q.id);
    }
    const p=s.places[1], q=s.places[2];
    p.lat=0;p.lon=0;q.lat=0;q.lon=1;
    syncGeography(s);
    assert.ok(Math.abs(localKm(p,q)-111.195)<0.001);
});

test('Unfilled orders raise pickup demand once and are allocated FIFO on replenishment',()=>{
    const s=seed(), item=product(s,2);
    for(let i=0;i<12;i++)apply(s,{type:'order',product:2,to:'p2'});
    const score=()=>demandAt(s,'p1',item.category).count;
    const before=score();
    for(let i=0;i<2;i++)apply(s,{type:'order',product:2,to:'p1'});
    const [first,second]=s.orders.slice(-2);
    assert.equal(first.status,'Запрошен у продавца');
    assert.equal(score(),before+2);
    assert.equal(freeStock(s,item,'p1'),0);
    assert.equal(s.requests.length,0);
    apply(s,{type:'restock',product:2,place:'p1',qty:1});
    assert.equal(first.status,'Готов к выдаче');
    assert.equal(second.status,'Запрошен у продавца');
    assert.equal(score(),before+2);
    assert.equal(freeStock(s,item,'p1'),0);
});

test('Short count releases the reservation and isolates missing stock',()=>{
 const s=seed(), p=product(s,1)
 apply(s,{type:'transfer',product:1,qty:3,place:'p1',to:'p2'})
 const r=s.requests[0]
 apply(s,{type:'trip',ids:[r.id],robot:'R-01'})
 apply(s,{type:'shortage',request:r.id,place:'p1',missing:1})
 assert.equal(p.stock.p1,11)
 assert.equal(s.discrepancies[0].qty,1)
 assert.equal(r.qty,2)
 assert.equal(space(s,'p2').held,0)
})
test('Partial receipt credits only counted packages and leaves the rest in transit',()=>{
 const s=seed(), p=product(s,1)
 apply(s,{type:'transfer',product:1,qty:3,place:'p1',to:'p2'})
 const r=s.requests[0]
 apply(s,{type:'trip',ids:[r.id],robot:'R-01'})
 apply(s,{type:'ship',request:r.id,place:'p1'},1000)
 apply(s,{type:'receive',request:r.id,place:'p2',received:1},r.eta)
 assert.equal(p.stock.p2,1)
 assert.equal(r.status,'В пути')
 assert.equal(r.qty,2)
 apply(s,{type:'receive',request:r.id,place:'p2'},r.eta)
 assert.equal(p.stock.p2,3)
 assert.equal(s.trips[0].status,'Завершён')
})

test('Dispatch sends a timed-out singleton to the hub flow but waits for physical handover',async()=>{
    const {scheduleDispatch}=await import('./model.mjs')
    const s=seed()
    apply(s,{type:'transfer',product:2,place:'p2',to:'p1',qty:1},1000)
    const r=s.requests[0]
    scheduleDispatch(s,60999)
    assert.equal(r.status,'Новая')
    scheduleDispatch(s,61000)
    assert.equal(r.kind,'Магистраль')
    assert.equal(r.status,'Согласование')
    apply(s,{type:'reply',place:r.target,batch:r.batch,accept:true})
    scheduleDispatch(s,70000)
    assert.equal(r.status,'Погрузка')
    assert.equal(r.departed,false)
})
