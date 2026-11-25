import test from 'node:test'
import assert from 'node:assert/strict'
import {seed,apply,space,freeStock,product} from './model.mjs'

test('Hub order: rejection, rerouting, alternate pickup, robot failure, issue and return',()=>{
 const s=seed(),act=(type,data={})=>apply(s,{type,...data})
 act('order',{product:3,to:'p2'})
 const o=s.orders[0],r=s.requests[0]
 assert.equal(freeStock(s,product(s,3),'hub'),11)
 act('offer',{ids:[r.id],place:'p3'})
 assert.equal(space(s,'p3').held,8)
 act('reply',{place:'p3',batch:r.batch,accept:false})
 assert.equal(r.target,'p1');assert.equal(space(s,'p3').held,0)
 act('reply',{place:'p1',batch:r.batch,accept:true})
 assert.equal(o.status,'Предложение')
 assert.equal(freeStock(s,product(s,3),'p1'),0)
 act('choice',{order:o.id,accept:false})
 const local=s.requests.at(-1),args={ids:[local.id],robot:'R-01'}
 assert.throws(()=>act('trip',args))
 act('day');act('trip',args)
 const t=s.trips[0]
 act('advance',{trip:t.id});assert.equal(product(s,3).stock.p1,0)
 act('failure',{trip:t.id});assert.equal(product(s,3).stock.p1,1)
 act('trip',args);const t2=s.trips.at(-1)
 for(let i=0;i<3;i++)act('advance',{trip:t2.id})
 assert.equal(o.status,'Готов к выдаче');assert.equal(o.loc,'p2')
 act('issue',{order:o.id,place:'p2'})
 assert.throws(()=>act('issue',{order:o.id,place:'p2'}));assert.equal(s.ledger.length,1)
 act('return',{order:o.id,place:'p2'});assert.equal(product(s,3).stock.p2,1)
})
test('Local buyer accepts pickup and stock cannot be overbooked',()=>{
 const s=seed()
 apply(s,{type:'order',product:1,to:'p2'});const o=s.orders[0]
 apply(s,{type:'choice',order:o.id,accept:true})
 assert.equal(o.loc,'p1');assert.equal(o.status,'Готов к выдаче')
 assert.equal(freeStock(s,product(s,1),'p1'),11)
 assert.throws(()=>apply(s,{type:'transfer',product:1,place:'p1',to:'p3',qty:12}))
})
test('New listing, capacity reservation, grouped inbound and multi-stop route',()=>{
 const s=seed(),act=(type,a)=>apply(s,{type,...a})
 act('product',{name:'Кабель',category:'Электроника',qty:8,price:599,liters:1,dims:[10,10,10],place:'hub'})
 const p=s.products.at(-1)
 for(const to of ['p2','p3'])act('transfer',{product:p.id,place:'hub',qty:3,to})
 act('offer',{ids:s.requests.map(r=>r.id),place:'p1'})
 assert.equal(space(s,'p1').held,6)
 assert.throws(()=>act('capacity',{place:'p1',value:25}))
 act('reply',{batch:s.requests[0].batch,place:'p1',accept:true})
 const local=s.requests.filter(r=>r.kind==='Робот')
 act('trip',{ids:local.map(r=>r.id),robot:'R-01'})
 assert.deepEqual(new Set(s.trips[0].route),new Set(['p1','p2','p3']))
 for(let i=0;i<3;i++)act('advance',{trip:s.trips[0].id})
 assert.deepEqual(p.stock,{hub:2,p1:0,p2:3,p3:3})
})
test('All points reject: retry after capacity changes; local shipment via hub',()=>{
 const s=seed(),act=(type,a)=>apply(s,{type,...a})
 act('transfer',{product:1,qty:2,place:'p1',to:'p2'})
 const r=s.requests[0];act('viaHub',{ids:[r.id]});act('offer',{ids:[r.id],place:'p2'})
 act('reply',{place:'p2',batch:r.batch,accept:false});act('reply',{place:'p3',batch:r.batch,accept:false})
 assert.equal(r.status,'Ожидает места')
 act('offer',{ids:[r.id],place:'p2'});act('reply',{place:'p2',batch:r.batch,accept:true})
 assert.equal(product(s,1).stock.p2,2)
})

