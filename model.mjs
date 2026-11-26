import { addStock, shippedCargo, takeStock } from './inventory.mjs'
import { ledgerComparison, rates, travelSeconds } from './economics.mjs'

export { travelSeconds }

export const categories = ['Электроника','Дом','Аксессуары']
export const stages = ['Погрузка','В пути','Разгрузка','Завершён']
const catalogAdditions = [
  ['Мышь Pixel','Электроника',1290,1,'🖱️',{p1:5,p2:4,hub:10}],
  ['Кабель Flex','Электроника',490,1,'🔌',{p2:6,p4:5,hub:12}],
  ['Колонка Beat','Электроника',2290,3,'🔊',{p3:3,p5:3,hub:8}],
  ['Контейнер Bento','Дом',790,2,'🍱',{p1:4,p3:4,p4:3}],
  ['Бутылка Aqua','Дом',690,2,'💧',{p2:4,p5:4,hub:8}],
  ['Органайзер Grid','Дом',1190,4,'🧺',{p3:3,p4:3,hub:6}],
  ['Зонт Compact','Аксессуары',1490,2,'☂️',{p1:4,p2:4,p5:4}],
  ['Сумка Weekender','Аксессуары',1990,4,'👜',{p3:3,p5:3,hub:6}],
  ['Чехол Travel','Аксессуары',890,1,'🎒',{p2:5,p4:5,p5:5}]
]

export const rover = {
  liters: 61,
  maxKg: 25,
  minUnits: 3,
  autoUnits: 6,
  collectMilliseconds: 7000,
  idealMin: 8,
  idealMax: 14
}

// Legacy and demo cards use a nominal one-kilogram package.
export function loadKg(s, rows) {
  return rows.reduce((sum, row) => sum + (product(s,row.product).weightKg ?? 1) * row.qty, 0)
}

export function seed(){
  const places = [
    ['hub','Распределительный хаб','Казань',0,0,100000],
    ['p1','Центральный','Йошкар-Ола',2,3,200],
    ['p2','Заречный','Йошкар-Ола',4,4,150],
    ['p3','Парковый','Йошкар-Ола',1,5,120],
    ['p4','Университетский','Казань',3,2,160],
    ['p5','Северный','Казань',4,5,120]
  ].map(([id,name,city,x,y,capacity])=>({id,name,city,x,y,capacity}))
  const products=[
    ['Наушники Studio','Электроника',2490,2,'p1','🎧'],
    ['Термокружка Daily','Дом',990,1,'p2','☕'],
    ['Рюкзак City','Аксессуары',2190,8,'hub','🎒'],
    ['Лампа Orbit','Дом',1590,3,'p3','💡'],
    ['Зарядка USB-C','Электроника',890,2,'hub','🔌'],
    ['Часы Motion','Аксессуары',1790,1,'p4','⌚']
  ].map(([name,category,price,liters,loc,icon],i)=>({id:i+1,name,category,price,liters,icon,dims:[10,10,liters*10],stock:{[loc]:12},day:0}))
  const state={places,products,orders:[],requests:[],trips:[],day:7,next:10,version:0,ledger:[],history:places.slice(1).flatMap((p,i)=>categories.map((category,j)=>({place:p.id,category,count:3+(i*7+j*11)%23})))}
  expandCatalog(state)
  return state
}

export function expandCatalog(state) {
  if (state.catalogVersion >= 1) return false
  for (const [name,category,price,liters,icon,locations] of catalogAdditions) {
    const stock={}
    for (const [id,qty] of Object.entries(locations)) {
      const available=Math.floor((space(state,id).free+1e-8)/liters)
      if (available>0) stock[id]=Math.min(qty,available)
    }
    state.products.push({id:state.next++,name,category,price,liters,icon,dims:[10,10,liters*10],stock,day:state.day})
  }
  state.catalogVersion=1
  return true
}
function check(ok,msg){if(!ok)throw Error(msg)}
function number(v,min,max,integer=false){const n=Number(v);check(Number.isFinite(n)&&n>=min&&n<=max&&(!integer||Number.isInteger(n)),'Проверьте числовое значение');return n}
export const place=(s,id)=>s.places.find(p=>p.id===id)
export const product=(s,id)=>s.products.find(p=>p.id===Number(id))
const active=r=>!['Доставлено','Отменено'].includes(r.status)
export function freeStock(s,p,loc){
  const orders=s.orders.filter(o=>o.product===p.id&&o.loc===loc&&!['Выдан','Возвращён','В пути'].includes(o.status)).length
  const reserved=s.requests.filter(r=>!r.order&&r.product===p.id&&r.from===loc&&active(r)&&!r.departed).reduce((a,r)=>a+r.qty,0)
  return (p.stock[loc]||0)-orders-reserved
}
export function space(s,id){
  const pickup=s.orders.filter(o=>o.pickup&&o.loc===id&&!['Выдан','Возвращён','В пути'].includes(o.status)).reduce((n,o)=>n+product(s,o.product).liters,0)
  const used=-pickup+s.products.reduce((n,p)=>n+(p.stock[id]||0)*p.liters,0)
  const held=s.requests.filter(r=>active(r)&&r.purpose!=='pickup'&&r.target===id&&['Согласование','Погрузка','В пути','Разгрузка'].includes(r.status)).reduce((n,r)=>n+product(s,r.product).liters*r.qty,0)
  return {used,held,pickup,free:place(s,id).capacity-used-held}
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
export function source(s,p,target){
  const dest=place(s,target)
  return s.places.filter(q=>freeStock(s,p,q.id)>0).sort((a,b)=>rank(a)-rank(b))[0]
  function rank(q){return q.id===target?0:q.id==='hub'?100:q.city===dest.city?1+distance(q,dest):200+distance(q,dest)}
}
export function demandAt(s, point, category) {
  const history=s.history.find(row=>row.place===point&&row.category===category)?.count??0
  const orders=s.orders.filter(o=>o.to===point&&o.status!=='Возвращён'&&product(s,o.product)?.category===category).length
  return {history,orders,count:history+orders}
}

function demandDestination(s, city, category, liters, excluded) {
  check(s.places.some(q=>q.id!=='hub'&&q.city===city),'Выберите город')
  const candidates=s.places
    .filter(q=>q.id!=='hub'&&q.city===city&&q.id!==excluded)
    .map(point=>({point,free:space(s,point.id).free,count:demandAt(s,point.id,category).count}))
    .filter(row=>row.free+1e-8>=liters)
    .sort((a,b)=>b.count-a.count||b.free-a.free||a.point.id.localeCompare(b.point.id))
  check(candidates.length,'В выбранном городе нет ПВЗ, куда помещается вся партия')
  return candidates[0].point
}

function request(s,p,qty,from,to,order,now){
  const trunk=from==='hub'||place(s,from).city!==place(s,to).city
  const r={id:s.next++,product:p.id,qty,from,to,order,purpose:order?'pickup':'storage',created:s.day,queuedAt:now,status:'Новая',kind:trunk?'Магистраль':'Робот',target:null,tried:[],departed:false}
  s.requests.push(r);return r
}
function volume(s,rows){return rows.reduce((a,r)=>a+product(s,r.product).liters*r.qty,0)}
function suggest(s,rows,id){
  const city=place(s,rows[0].to).city
  const fits=p=>p&&p.id!=='hub'&&p.city===city&&space(s,p.id).free+1e-8>=volume(s,rows.filter(r=>r.purpose!=='pickup'))&&rows.every(r=>!r.tried.includes(p.id)&&r.from!==p.id)
  const preferred=rows.every(r=>!r.order&&r.to===rows[0].to)?place(s,rows[0].to):null
  const dest=id?place(s,id):fits(preferred)?preferred:s.places.find(fits)
  if(id)check(fits(dest),'У пункта недостаточно места, другой город или он уже отклонил партию')
  for(const r of rows){r.target=dest?.id||null;r.status=dest?'Согласование':'Ожидает места';r.batch=rows[0].id}
}
function arrive(s,r,now){
  const item=product(s,r.product)
  const order=s.orders.find(o=>o.id===r.order)
  const cargo=r.departed?shippedCargo(item,r):takeStock(item,r.from,r.qty,s.day,r.order)
  addStock(item,r.target,cargo,s.day,r.order,r.purpose==='pickup')
  delete r.cargo
  r.status='Доставлено'
  if(order){
    order.pickup=r.purpose==='pickup'
    order.loc=r.target
    order.status=order.loc===order.to?'Готов к выдаче':'Предложение'
    order.cost+=(r.cost||0)
    if(order.status==='Готов к выдаче')order.readyAt=now
  }else if(r.target!==r.to){
    request(s,item,r.qty,r.target,r.to,null,now)
  }
}
export function packingLiters(dims){
 check(Array.isArray(dims)&&dims.length===3,'Введите три размера упаковки')
 return dims.map(v=>number(v,.01,1000)).reduce((v,n)=>v*n,1)/1000
}
export function routePosition(stops, now) {
 let [x,y,start]=stops[0]
 for(const [nextX,nextY,end] of stops.slice(1)){
   if(!end || end<=start) break
   const fraction=Math.min(1,Math.max(0,(now-start)/(end-start)))
   x+=(nextX-x)*fraction
   y+=(nextY-y)*fraction
   if(fraction<1) break
   start=end
 }
 return {x,y}
}

export function apply(s,a,now=Date.now()){
 const p=product(s,a.product),q=place(s,a.place),to=place(s,a.to)
 const o=s.orders.find(o=>o.id===Number(a.order))
 const rows=s.requests.filter(r=>Array.isArray(a.ids)&&a.ids.includes(r.id))
 switch(a.type){
 case 'product': {
   check(categories.includes(a.category)&&typeof a.name==='string'&&a.name.trim().length>0&&a.name.length<=80,'Проверьте карточку товара')
   const liters=packingLiters(a.dims),qty=number(a.qty,1,10000,true)
   const destination=a.city==null?q:demandDestination(s,a.city,a.category,liters*qty)
   check(destination&&space(s,destination.id).free+1e-8>=liters*qty,'Недостаточно места')
   s.products.push({id:s.next++,name:a.name.trim(),category:a.category,price:number(a.price,.01,1e7),liters,weightKg:number(a.weightKg ?? 1,.001,1e6),dims:a.dims.map(v=>number(v,.01,1000)),stock:{[destination.id]:qty},icon:'📦',day:s.day})
   return a.city==null?undefined:'Товар размещён в ПВЗ «'+destination.name+'»'
 }
 case 'restock': {
   check(p&&(a.city!=null||q),'Выберите товар и точку размещения')
   const qty=number(a.qty,1,10000,true)
   const destination=a.city==null?q:demandDestination(s,a.city,p.category,p.liters*qty)
   check(destination&&space(s,destination.id).free+1e-8>=p.liters*qty,'Недостаточно места')
   addStock(p,destination.id,[{quantity:qty,storedDays:0}],s.day)
   return a.city==null?undefined:'Остаток пополнен в ПВЗ «'+destination.name+'»'
 }
 case 'capacity':check(q&&q.id!=='hub','Выберите ПВЗ');{const v=number(a.value,0,1e6);check(v>=q.capacity-space(s,q.id).free,'Объём занят товаром или обещан входящей партии');q.capacity=v}break
 case 'transfer':{
   check(q&&p,'Выберите товар и пункт отправки')
   const qty=number(a.qty,1,10000,true)
   check(freeStock(s,p,q.id)>=qty,'Недостаточно свободного товара')
   const destination=a.city==null?to:demandDestination(s,a.city,p.category,p.liters*qty,q.id)
   check(destination&&destination.id!=='hub'&&destination.id!==q.id,'Проверьте пункт назначения')
   request(s,p,qty,q.id,destination.id,null,now)
   return a.city==null?undefined:'Заявка создана для ПВЗ «'+destination.name+'»'
 }
 case 'order':{
   check(p&&to&&to.id!=='hub','Выберите товар и пункт выдачи');const src=source(s,p,to.id);check(src,'Товар закончился')
   const order={id:s.next++,product:p.id,loc:src.id,to:to.id,status:'Предложение',cost:0,created:s.day,createdAt:now}
   s.orders.push(order)
   if(src.id===to.id){order.status='Готов к выдаче';order.readyAt=now}
   else if(src.id==='hub'||src.city!==to.city){order.status='Доставка';request(s,p,1,src.id,to.id,order.id,now)}
   break
 }
 case 'choice':{
   check(o?.status==='Предложение','Предложение уже обработано')
   if(a.accept===true){
     o.status='Готов к выдаче'
     o.readyAt=now
   }else{
     o.status='Доставка'
     request(s,product(s,o.product),1,o.loc,o.to,o.id,now)
   }
   break
 }
 case 'viaHub':check(rows.length&&rows.every(r=>r.kind==='Робот'&&r.status==='Новая'),'Выберите новые городские заявки');for(const r of rows)r.kind='Магистраль';break
 case 'offer':case 'trip':{
   check(rows.length,'Выберите заявки')
   for(const r of rows){
     const purpose=a.purpose==='auto'||!a.purpose?(r.order?'pickup':'storage'):a.purpose
     check(['storage','pickup'].includes(purpose)&&!(purpose==='pickup'&&!r.order),'Для выдачи требуется заказ покупателя')
     r.purpose=purpose
   }
   if(a.type==='trip')return prepareTrip(s,a,rows)
   check(rows.length&&rows.every(r=>r.kind==='Магистраль'&&['Новая','Ожидает места'].includes(r.status)&&place(s,r.to).city===place(s,rows[0].to).city),'Выберите новые заявки в один город');for(const r of rows)if(r.status==='Ожидает места')r.tried=[];suggest(s,rows,a.place);break
 }
 case 'reply':{
   const group=s.requests.filter(r=>r.batch===Number(a.batch)&&r.status==='Согласование'&&r.target===a.place)
   check(group.length,'Заявка уже обработана')
   if(a.accept===true){for(const r of group){r.cost=rates.hubTransport*r.qty;r.status='Погрузка'}}
   else{for(const r of group){r.tried.push(r.target);r.target=null;r.status='Новая'}suggest(s,group)}
   break
 }
 case 'stuck':case 'dispatchCourier':case 'rescue':{
   const trip=s.trips.find(t=>t.id===Number(a.trip))
   check(trip?.status==='В пути','Выберите активный рейс')
   const shipments=s.requests.filter(r=>trip.ids.includes(r.id))
   if(a.type==='stuck'){
     check(!trip.incident,'Симуляция уже проведена для этого рейса')
     const moving=shipments.filter(r=>r.status==='В пути' && now<r.eta)
     check(moving.length,'Ровер уже прибыл')
     trip.incident={at:now,dispatchedAt:null}
     for(const shipment of moving)shipment.pausedAt=now
     break
   }

   const incident=trip.incident
   check(incident&&incident.resumedAt==null,'Нет активного инцидента')
   const paused=shipments.filter(r=>r.pausedAt!=null)
   if(a.type==='dispatchCourier'){
     check(incident.dispatchedAt===null,'Курьер уже отправлен')
     const units=paused.reduce((total,r)=>total+r.qty,0)
     check(units>0,'В рейсе нет груза, ожидающего помощи')
     incident.dispatchedAt=now
     trip.assistanceCost=rates.courier
     for(const r of paused){
       const order=s.orders.find(o=>o.id===r.order)
       if(order)order.assistanceCost=(order.assistanceCost??0)+rates.courier*r.qty/units
     }
   }else{
     check(incident.dispatchedAt!==null,'Сначала отправьте курьера')
     const delay=Math.max(0,now-incident.at)
     for(const r of paused){
       r.sentAt+=delay;r.eta+=delay;delete r.pausedAt
     }
     incident.resumedAt=now
   }
   break
 }
 case 'ship':case 'receive':case 'failure':{
   const r=s.requests.find(r=>r.id===Number(a.request))
   const t=a.type==='failure'?s.trips.find(t=>t.id===Number(a.trip)):s.trips.find(t=>t.ids.includes(r?.id)&&!['Сбой','Завершён'].includes(t.status))
   const items=t?s.requests.filter(r=>t.ids.includes(r.id)):[r]
   if(a.type==='failure'){
     check(t&&['Погрузка','В пути','Разгрузка'].includes(t.status),'Рейс уже закрыт')
     const moving=items.filter(i=>i.departed&&i.status!=='Доставлено')
     const held=moving.filter(i=>!s.orders.find(o=>o.id===i.order)?.pickup)
     check(space(s,t.route[0]).free>=volume(s,held),'Освободите место для возврата')
     t.failedTransport=moving.reduce((total,i)=>total+(i.cost??0),0)
     for(const i of items.filter(i=>i.status!=='Доставлено')){
       const order=s.orders.find(o=>o.id===i.order)
       if(i.departed){
         const item=product(s,i.product)
         addStock(item,i.from,shippedCargo(item,i),s.day,i.order,order?.pickup)
         if(order)order.failedTransport=(order.failedTransport??0)+(i.cost??0)
       }
       if(order)order.status='Доставка'
       delete i.cargo
       delete i.pausedAt
       Object.assign(i,{departed:false,status:'Новая',target:null,sentAt:null,eta:null})
     }
     t.status='Сбой';break
   }
   check(r,'Заявка не найдена')
   if(a.type==='ship'){
     check(r.from===a.place&&items.every(i=>i.status==='Погрузка'),'Отправку подтверждает пункт отправления после согласования')
     for(const i of items){
       i.cargo=takeStock(product(s,i.product),i.from,i.qty,s.day,i.order)
       const order=s.orders.find(o=>o.id===i.order)
       if(order){
         order.status='В пути'
         order.firstSentAt??=now
       }
       const seconds=travelSeconds(t?Math.max(1,t.route.indexOf(i.target)):0)
       Object.assign(i,{departed:true,status:'В пути',sentAt:now,eta:now+seconds*1000})
     }
     if(t)t.status='В пути'
   }else{
     check(r.pausedAt==null,'Рейс приостановлен')
     check(r.target===a.place&&['В пути','Разгрузка'].includes(r.status)&&now>=(r.eta||0),'Приёмка доступна в пункте назначения после прибытия')
     arrive(s,r,now);r.receivedAt=now
     if(t&&items.every(i=>i.status==='Доставлено'))t.status='Завершён'
   }
   break
 }
 case 'issue':{
   check(o?.status==='Готов к выдаче'&&o.loc===a.place,'Заказ не готов в этом ПВЗ')
   const item=product(s,o.product)
   const [unit]=takeStock(item,o.loc,1,s.day,o.id)
   o.status='Выдан'
   const storage=unit.storedDays*item.liters*rates.storagePerLiterDay
   const payout=rates.handling+rates.pickup+storage
   const comparison=ledgerComparison({storage,transport:o.cost,failed:o.failedTransport,assistance:o.assistanceCost})
   const elapsed=o.createdAt!=null&&o.readyAt!=null?Math.max(0,o.readyAt-o.createdAt)/1000:null
   const waiting=o.createdAt!=null&&o.firstSentAt!=null?Math.max(0,o.firstSentAt-o.createdAt)/1000:null
   s.ledger.push({
     order:o.id,loc:o.loc,price:item.price,storage,payout,transport:o.cost,pvz:payout-rates.pickup,
     seller:item.price*.3-payout-o.cost,saving:comparison.saving,comparison,elapsed,waiting,
   })
   break
 }
 case 'return':{
   check(o?.status==='Выдан'&&o.loc===a.place,'Возврат уже учтён или выбран другой ПВЗ')
   const item=product(s,o.product)
   check(space(s,o.loc).free>=item.liters,'Нет места для возврата')
   addStock(item,o.loc,[{quantity:1,storedDays:0}],s.day)
   o.status='Возвращён'
   const entry=s.ledger.find(l=>l.order===o.id)
   entry.seller-=entry.price*.3+rates.returnHandling
   if(entry.comparison){
     entry.comparison=ledgerComparison({
       storage:entry.storage,transport:entry.transport,returned:true,
       failed:entry.comparison.mesh.failed,assistance:entry.comparison.mesh.assistance,
     })
     entry.saving=entry.comparison.saving
   }else{
     entry.saving-=rates.returnHandling
   }
   break
 }
 case 'day':s.day++;break
 default:throw Error('Неизвестная операция')
 }
}

function compatibleLoad(s, requests) {
  let liters=0, kilograms=0, units=0
  const held=new Map()
  const rows=[]
  for(const shipment of requests){
    const item=product(s,shipment.product)
    const dest=place(s,shipment.to)
    if(!item||!dest||dest.city!==place(s,shipment.from)?.city)continue
    const added=item.liters*shipment.qty
    const weight=(item.weightKg??1)*shipment.qty
    if(liters+added>rover.liters+1e-8||kilograms+weight>rover.maxKg+1e-8)continue
    if(shipment.purpose!=='pickup'){
      const reserved=(held.get(dest.id)??0)+added
      if(reserved>space(s,dest.id).free+1e-8)continue
      held.set(dest.id,reserved)
    }
    rows.push(shipment)
    liters+=added
    kilograms+=weight
    units+=shipment.qty
  }
  return {rows,units}
}

export function scheduleRovers(s,now) {
  const previous=s.dispatchWindows??{}
  const windows={}
  let assigned=false
  const waiting=s.requests.filter(r=>r.kind==='Робот'&&r.status==='Новая').sort((a,b)=>a.id-b.id)
  const groups=Map.groupBy(waiting,r=>r.from)
  const robots=['R-01','R-02'].filter(robot=>!s.trips.some(t=>t.robot===robot&&!['Сбой','Завершён'].includes(t.status)))
  const origins=[...groups.keys()].sort((a,b)=>(previous[a]?.since??now)-(previous[b]?.since??now))

  for(const origin of origins){
    const {rows,units}=compatibleLoad(s,groups.get(origin))
    if(units<rover.autoUnits)continue
    const since=previous[origin]?.since??now
    if(now-since>=rover.collectMilliseconds&&robots.length){
      prepareTrip(s,{robot:robots.shift()},rows)
      assigned=true
    }else{
      windows[origin]={since,units}
    }
  }

  if(!assigned&&Object.keys(previous).length===Object.keys(windows).length
    &&Object.entries(windows).every(([origin,window])=>previous[origin]?.since===window.since&&previous[origin].units===window.units))return false
  s.dispatchWindows=windows
  return true
}

function prepareTrip(s,a,rows){
   check(rows.length&&rows.every(r=>r.kind==='Робот'&&r.status==='Новая'&&r.from===rows[0].from),'Выберите новые заявки из одного ПВЗ')
   const qty=rows.reduce((n,r)=>n+r.qty,0)
   check(qty >= rover.minUnits, 'Для рейса нужно не менее '+rover.minUnits+' упаковок')
   check(volume(s,rows) <= rover.liters + 1e-8, 'Общий объём груза превышает '+rover.liters+' л')
   check(loadKg(s,rows) <= rover.maxKg + 1e-8, 'Масса груза превышает '+rover.maxKg+' кг')
   check(['R-01','R-02'].includes(a.robot)&&!s.trips.some(t=>t.robot===a.robot&&!['Сбой','Завершён'].includes(t.status)),'Робот занят')
   const stops=[...new Set(rows.map(r=>r.to))],route=[rows[0].from]
   for(const id of stops)check(space(s,id).free+1e-8>=volume(s,rows.filter(r=>r.to===id&&r.purpose!=='pickup')),'Нет места в пункте назначения')
   while(stops.length){const here=place(s,route.at(-1));stops.sort((a,b)=>distance(here,place(s,a))-distance(here,place(s,b)));route.push(stops.shift())}
   const trip={id:s.next++,robot:a.robot,status:stages[0],route,ids:rows.map(r=>r.id)};s.trips.push(trip)
   for(const r of rows){r.status=trip.status;r.target=r.to;r.cost=rates.roverTrip*r.qty/qty}
}
