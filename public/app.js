import {categories,place,product,freeStock,space,source,packingLiters} from '/model.mjs'
const $=s=>document.querySelector(s),root=$('#main')
let query=''
const role=document.documentElement.dataset.site
let skew=0
let state,destination='p2',office='p1',heatCat='Электроника',heatCity='Йошкар-Ола',filter='Все',transferProduct=1,selected=new Set(),busy=false,timer
const esc=v=>String(v??'').replace(/[<>"'&]/g,c=>({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c]))
const num=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2}),rub=n=>num(n)+' ₽'
const name=id=>place(state,id)?.name||'—',loc=id=>id==='hub'?name(id):'ПВЗ «'+name(id)+'»'
const label=(title,body)=>`<label>${title}${body}</label>`
const opts=(items,current)=>items.map(([value,title])=>`<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(title)}</option>`).join('')
const offices=()=>state.places.filter(p=>p.id!=='hub')
const points=(list,current)=>opts(list.map(p=>[p.id,`${p.city} · ${p.name}`]),current)
const select=(key,values)=>`<select name="${key}">${values}</select>`
const input=(key,title,value,min=.01,step='any')=>label(title,`<input required type="number" name="${key}" min="${min}" step="${step}" value="${value}">`)
const field=(key,title,values)=>label(title,select(key,values))
const button=(title,act,data={},primary=false)=>`<button type="button" class="${primary?'primary':''}" data-action="${act}" ${Object.entries(data).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')}>${title}</button>`
const submit=t=>`<button class="primary">${t}</button>`
const panel=(title,content)=>`<section class="panel"><h3>${title}</h3>${content}</section>`
const none=t=>`<p class="muted">${t}</p>`
const tag=t=>`<span class="tag">${esc(t)}</span>`
const chips=(items,selected,action)=>`<div class="chips">${items.map(t=>`<button class="${t===selected?'selected':''}" data-action="${action}" data-value="${esc(t)}">${esc(t)}</button>`).join('')}</div>`
const hero=(title,desc,extra='')=>`<div class="hero"><div><h1>${title}</h1><p>${desc}</p></div>${extra}</div>`
function notify(t){$('#toast').textContent=t;clearTimeout(timer);timer=setTimeout(()=>$('#toast').textContent='',4500)}
function orderRow(o,atOffice=false){
 const p=product(state,o.product)
 let extra=''
 if(!atOffice&&o.status==='Предложение')extra=`<div class="notice">Товар уже в ${loc(o.loc)}. Заберёте здесь?<div class="actions">${button('Заберу здесь','choice',{order:o.id,accept:1},true)}${button('Доставить в выбранный ПВЗ','choice',{order:o.id,accept:0})}</div></div>`
 if(atOffice&&o.status==='Готов к выдаче')extra=button('Подтвердить выдачу','issue',{order:o.id,place:office},true)
 if(atOffice&&o.status==='Выдан')extra=button('Принять возврат','return',{order:o.id,place:office})
 const transport=state.requests.find(r=>r.order===o.id&&r.status==='В пути')
 return `<div class="entry"><div class="row"><strong>№${o.id} · ${esc(p.name)}</strong>${tag(o.status)}</div><p class="muted">Выбран ${loc(o.to)} · ${o.status==='В пути'?'товар в рейсе':'место учёта: '+loc(o.loc)}</p>${transport?progress(transport):''}${extra}</div>`
}
function buyer(){
 const orders=state.orders.slice().reverse()
 const matches=state.products.filter(p=>(filter==='Все'||p.category===filter)&&(p.name+' '+p.category).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')))
 const routeArt='<div class="route-art" aria-hidden="true"><i></i><b></b><span></span></div>'
 return hero('Товары рядом','Выберите пункт выдачи, чтобы увидеть доступность и срок доставки.',routeArt+label('Мой пункт выдачи',`<select id="destination">${points(offices(),destination)}</select>`))+
 (orders.length?panel('Мои заказы',orders.map(o=>orderRow(o)).join('')):'')+
 `<div class="head"><h2>Каталог</h2>${chips(['Все',...categories],filter,'filter')}</div><div class="grid">`+
 matches.map(p=>{
 const src=source(state,p,destination),near=src&&src.id!=='hub'&&src.city===place(state,destination).city&&Math.hypot(src.x-place(state,destination).x,src.y-place(state,destination).y)<=4
 const hint=!src?'Нет в наличии':near?'Товар рядом · '+name(src.id):src.city===place(state,destination).city&&src.id!=='hub'?'По городу · ориентир 2 часа':'Через хаб · ориентир 1–2 дня'
 return `<article class="card"><div class="art tile-${p.id>=1&&p.id<=6?p.id:'new'}"><span aria-hidden="true">${p.id>6?'📦':''}</span></div><div class="cat">${p.category}</div><h3>${esc(p.name)}</h3><div class="price">${rub(p.price)}</div><button class="primary" data-action="order" data-product="${p.id}" ${src?'':'disabled'}>Заказать</button><small>${hint}</small></article>`}).join('')+(matches.length?'':none('Товары не найдены. Измените запрос или категорию.'))+'</div>'
}
function stockLines(where){
 return state.products.filter(p=>Object.entries(p.stock).some(([id,n])=>n>0&&(!where||where===id))).map(p=>`<div class="entry"><b>${esc(p.name)}</b> <span class="muted">· ${p.dims.map(num).join(' × ')} см · ${num(p.liters)} л</span><br>${Object.entries(p.stock).filter(([id,n])=>n>0&&(!where||where===id)).map(([id,n])=>`${loc(id)}: ${freeStock(state,p,id)} свободно из ${n}`).join(' · ')}</div>`).join('')||none('Полка пока пуста')
}
function seller(){
 const p=product(state,transferProduct)||state.products[0]
 const stock=state.places.filter(q=>freeStock(state,p,q.id)>0)
 const stats=offices().filter(q=>q.city===heatCity).map(q=>({q,count:state.history.find(h=>h.place===q.id&&h.category===heatCat).count+state.orders.filter(o=>o.to===q.id&&product(state,o.product).category===heatCat).length}))
 const max=Math.max(...stats.map(z=>z.count))
 return hero('Кабинет продавца','Размещение товара, остатки и спрос по пунктам выдачи.')+
 panel('Добавить карточку и оприходовать товар',`<form data-form="product" class="form">${label('Название','<input required maxlength="80" name="name" placeholder="Например, колонка">')}${field('category','Категория',opts(categories.map(c=>[c,c])))}${input('price','Цена, ₽',990)}${input('l','Длина, см',10)}${input('w','Ширина, см',10)}${input('h','Высота, см',20)}<label>Объём упаковки<output id="liters">2 л</output></label>${input('qty','Количество, шт.',3,1,1)}${field('place','Куда передан товар',points(state.places,'p1'))}${submit('Добавить товар')}</form>`)+
 panel('Переместить товар',`<form data-form="transfer" class="form">${label('Товар',`<select id="transferProduct" name="product">${opts(state.products.map(i=>[i.id,i.name]),p.id)}</select>`)}${field('place','Откуда',points(stock))}${field('to','Желаемый ПВЗ',points(offices(),'p2'))}${input('qty','Упаковок',3,1,1)}${submit('Отправить заявку')}</form>`)+
 panel('Спрос по категории',`<div class="row"><p class="muted">Заказы по желаемому ПВЗ · цвет темнее при большем спросе</p><div class="actions"><select aria-label="Город карты" id="heatCity">${opts([...new Set(offices().map(q=>q.city))].map(c=>[c,c]),heatCity)}</select><select id="heatCat" aria-label="Категория карты">${opts(categories.map(c=>[c,c]),heatCat)}</select></div></div><div class="heatwrap"><div class="heat">${stats.map(({q,count})=>`<b class="pin" style="grid-column:${q.x};grid-row:${q.y};background:hsl(280 60% ${88-40*count/max}%);color:${count/max>.65?'white':'#361844'}">${q.name} · ${count}</b>`).join('')}</div></div><small>Условная схема города. Стартовая история демонстрационная, каждый новый заказ обновляет карту.</small>`)+
 `<div class="cols">${panel('Товар на полках',stockLines())}${panel('Экономика продавца',finance(false))}</div>`+
 panel('Заявки продавца',state.requests.filter(r=>!r.order).slice().reverse().map(reqRow).join('')||none('Заявок пока нет'))
}
function progress(r){
 const start=r.sentAt||0,end=r.eta||0
 return '<div class="journey" data-start="'+start+'" data-end="'+end+'"><progress max="100" aria-label="Ход доставки"></progress> <span></span></div>'
}
function updateTimers(){
 const now=Date.now()+skew
 for(const el of root.querySelectorAll('.journey')){
   const start=+el.dataset.start,end=+el.dataset.end,left=Math.max(0,Math.ceil((end-now)/1000))
   el.querySelector('progress').value=left?Math.max(0,100*(now-start)/Math.max(1,end-start)):100
   el.querySelector('span').textContent=left?'До прибытия: '+left+' с':'Прибыло · ожидает подтверждения ПВЗ'
 }
 for(const b of root.querySelectorAll('[data-ready-at]'))b.disabled=now<Number(b.dataset.readyAt)
}
function deliveries(site){
 const list=state.requests.filter(r=>r.from===site&&r.status==='Погрузка'||r.target===site&&['В пути','Разгрузка'].includes(r.status))
 if(!list.length)return ''
 return panel('Передача груза',list.map(r=>'<div class="entry">'+reqRow(r)+(r.status==='Погрузка'?button('Подтвердить отправку','ship',{request:r.id,place:site},true):'<button class="primary" data-action="receive" data-request="'+r.id+'" data-place="'+site+'" data-ready-at="'+(r.eta||0)+'">Подтвердить получение</button>')+'</div>').join(''))
}
function reqRow(r){return `<div class="entry">№${r.id} · ${esc(product(state,r.product).name)} × ${r.qty} <b>${loc(r.from)} → ${loc(r.to)}</b> ${tag(r.status)} ${r.purpose==='pickup'?'На выдачу':'На хранение'}${r.status==='В пути'?progress(r):''}${r.target?' · приём: '+loc(r.target):''}</div>`}
function finance(isOffice){
 const list=state.ledger.filter(l=>!isOffice||l.loc===office)
 if(!list.length)return none('Расчёт появится после выдачи первого заказа')
 return list.slice().reverse().map(l=>`<div class="entry"><b>Заказ №${l.order} · ${rub(isOffice?l.pvz:l.seller)} прибыли</b><br><span class="muted">${isOffice?`Начислено ${rub(l.payout)} · труд ${rub(12)} · хранение в начислении ${rub(l.storage)}`:`Продажа ${rub(l.price)} · себестоимость ${rub(l.price*.6)} · комиссия ${rub(l.price*.1)} · ПВЗ ${rub(l.payout)} · рейс ${rub(l.transport)}`}</span>${state.orders.find(o=>o.id===l.order).status==='Возвращён'?' · возврат':''}</div>`).join('')
}
function pvz(){
 const q=place(state,office),v=space(state,office)
 const groups=Object.groupBy(state.requests.filter(r=>r.target===office&&r.status==='Согласование'),r=>r.batch)
 return hero('Рабочее место ПВЗ','Приём партий, выдача заказов и управление складом.',label('Работаю в пункте',`<select id="office">${points(offices(),office)}</select>`))+
 deliveries(office)+panel('Вместимость мини-склада',`<div class="row"><p><b class="stat">${num(v.free)} л</b> свободно · занято ${num(v.used)} л · под заявки ${num(v.held)} л · зона выдачи отдельно ${num(v.pickup)} л</p><form class="form" data-form="capacity">${input('value','Вместимость, л',q.capacity,0)}${submit('Сохранить')}</form></div>`)+
 panel('Запросы на приёмку',Object.entries(groups).map(([batch,list])=>`<div class="entry"><b>Партия №${batch} · ${num(list.reduce((n,r)=>n+product(state,r.product).liters*r.qty,0))} л</b>${list.map(reqRow).join('')}<div class="actions">${button('Принять партию','reply',{batch,accept:1},true)}${button('Отклонить и перенаправить','reply',{batch,accept:0})}</div></div>`).join('')||none('Входящих запросов нет'))+
 panel('Выдача и возвраты',state.orders.filter(o=>o.loc===office&&['Готов к выдаче','Выдан','Возвращён'].includes(o.status)).map(o=>orderRow(o,true)).join('')||none('Заказов к выдаче пока нет'))+
 `<div class="cols">${panel('Остатки',stockLines(office))}${panel('Экономика ПВЗ',finance(true))}</div>`
}
function wb(){
 const queue=state.requests.filter(r=>['Новая','Ожидает места'].includes(r.status))
 const groups=Object.groupBy(queue,r=>r.kind==='Робот'?'robot-'+r.from:'hub-'+place(state,r.to).city)
 const freed=id=>!state.trips.some(t=>t.robot===id&&!['Завершён','Сбой'].includes(t.status))
 const forms=Object.entries(groups).map(([key,list])=>{
 const isHub=key.startsWith('hub-'),city=place(state,list[0].to).city
 return `<form class="entry" data-form="${isHub?'offer':'trip'}"><h3>${isHub?'Поставка в '+city:'Рейс из '+loc(list[0].from)}</h3>${list.map(r=>`<label class="check"><input name="ids" type="checkbox" value="${r.id}" ${selected.has(r.id)?'checked':''}>№${r.id} · ${esc(product(state,r.product).name)} × ${r.qty} → ${name(r.to)} · ${r.order?'заказ №'+r.order:'сток продавца'} · ${num(r.qty*product(state,r.product).liters)} л</label>`).join('')}<div class="form">${field('purpose','Назначение',opts([['auto','По заявкам'],['storage','На хранение'],['pickup','На выдачу по заказу']]))}${isHub?field('place','Пункт приёмки',opts([['','Подобрать по вместимости'],...offices().filter(q=>q.city===city).map(q=>[q.id,q.name+' · свободно '+num(space(state,q.id).free)+' л'])])):field('robot','Свободный робот',opts(['R-01','R-02'].filter(freed).map(t=>[t,t])))}${submit(isHub?'Запросить приёмку':'Построить маршрут и начать погрузку')}${isHub?'':'<button name="fallback">Отправить через хаб</button>'}</div><p class="muted tiny" data-quote></p></form>`
 }).join('')
 return hero('Диспетчерская WB','Сгруппируйте заявки одного города или соберите рейс робота.')+
 deliveries('hub')+panel('Очередь заявок',forms||none('Новых заявок нет. Создайте перемещение в кабинете продавца или оформите заказ.'))+
 panel('Рейсы роботов', '<p class="muted">Два робота · вместимость 80 л · отправление от 3 упаковок или после суток ожидания</p>'+ (state.trips.slice().reverse().map(t=>`<div class="entry"><div class="row"><b>${t.robot} · рейс №${t.id}</b>${tag(t.status)}</div><p>${t.route.map(name).join(' → ')}</p>${['Погрузка','В пути','Разгрузка'].includes(t.status)?`<div class="actions"><small>Отправку подтверждает исходный ПВЗ, получение — каждый принимающий пункт.</small>${button('Сбой и возврат на базу','failure',{trip:t.id})}</div>`:''}</div>`).join('')||none('Активных рейсов нет')))+
 panel('Экономика WB',state.ledger.map(l=>`<div class="entry">№${l.order} · базовый хаб 80 ₽ · выплаты ПВЗ ${rub(l.payout)} · перевозка ${rub(l.transport)} · эффект <b>${rub(l.saving)}</b></div>`).join('')||none('Сравнение с хабом появится после выдачи'))+
 panel('Все заявки',state.requests.slice().reverse().map(reqRow).join('')||none('История пуста'))+
 `<details class="panel"><summary>Управление демонстрацией</summary><p>День ${state.day}. Перевод времени добавляет день хранения и ожидания.</p><div class="actions">${button('Следующий день','day')}${button('Восстановить демоданные','reset')}</div></details>`
}
if(role==='buyer')$('#lookup').onsubmit=e=>{e.preventDefault();query=$('#query').value.trim();filter='Все';if(state)render()}
if(role==='buyer')$('#query').oninput=e=>{if(role==='buyer'&&state){query=e.target.value.trim();render()}}
function render(){document.body.dataset.role=role;root.innerHTML=({buyer,seller,wb,pvz}[role])();$('#clock').textContent='День '+state.day;updateTimers()}
async function refresh(){const r=await fetch('/api/state');if(!r.ok)throw Error('Сервер недоступен');const s=await r.json();skew=s.serverNow-Date.now()
 if(state&&s.version<state.version)return
 if(!state||s.version!==state.version||s.day!==state.day){
   const f=document.activeElement?.closest('form[data-form="product"],form[data-form="transfer"],form[data-form="capacity"]')
   const saved=f?new FormData(f):null,focus=document.activeElement?.name
   state=s;render()
   if(saved){const fresh=root.querySelector('form[data-form="'+f.dataset.form+'"]');if(fresh){for(const [k,v] of saved){if(fresh.elements[k])fresh.elements[k].value=v}fresh.elements[focus]?.focus();if(fresh.elements.l)fresh.elements.l.dispatchEvent(new Event('input',{bubbles:true}))}}
 }}
async function post(a){
 if(busy)return;busy=true
 try{const r=await fetch('/'+role+'/api/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...a,version:state.version})});const result=await r.json();if(!r.ok)throw Error(result.error);skew=result.serverNow-Date.now();state=result;selected.clear();render();notify('Готово')}
 catch(e){notify(e.message);await refresh().catch(()=>{})}finally{busy=false}
}
root.oninput=e=>{
 if(['l','w','h'].includes(e.target.name)){const f=e.target.form;try{$('#liters').textContent=packingLiters([f.l.value,f.w.value,f.h.value]).toLocaleString('ru-RU',{maximumSignificantDigits:8})+' л'}catch{$('#liters').textContent='Введите размеры'}}
}
root.onchange=e=>{const el=e.target;if(el.name==='ids'){if(el.checked)selected.add(+el.value);else selected.delete(+el.value);const rows=state.requests.filter(r=>[...el.form.querySelectorAll('input:checked')].some(i=>+i.value===r.id));const units=rows.reduce((n,r)=>n+r.qty,0);const quote=el.form.querySelector('[data-quote]');if(quote)quote.textContent=units?'Выбрано '+units+' шт. · '+num(rows.reduce((n,r)=>n+r.qty*product(state,r.product).liters,0))+' л'+(el.form.dataset.form==='trip'?' · рейс '+rub(360/units)+'/шт. · хаб 80 ₽/шт.':''):'';return}
 switch(el.id){case 'office':office=el.value;break;case 'destination':destination=el.value;break;case 'transferProduct':transferProduct=+el.value;break;case 'heatCat':heatCat=el.value;break;case 'heatCity':heatCity=el.value;break;default:return}render()}
root.onclick=e=>{const b=e.target.closest('button[data-action]');if(!b)return;const {action,...args}=b.dataset;if(action==='filter'){filter=args.value;render();return}
 if(action==='reset'&&!confirm('Заменить текущие заказы и остатки демонстрационными данными?'))return
 if(action==='order')args.to=destination
 if(action==='reply')args.place=office
 if('accept'in args)args.accept=args.accept==='1'
 post({type:action,...args})}
root.onsubmit=e=>{e.preventDefault();const f=e.target,d=new FormData(f),a=Object.fromEntries(d);a.type=f.dataset.form
 if(a.type==='product')a.dims=[a.l,a.w,a.h]
 if(a.type==='capacity')a.place=office
 if(['offer','trip'].includes(a.type)){a.ids=d.getAll('ids').map(Number);if(!a.ids.length){notify('Отметьте заявки для отправки');return}}
 if(e.submitter?.name==='fallback')a.type='viaHub';post(a)}
refresh().catch(e=>notify(e.message))
window.addEventListener('focus',()=>refresh().catch(e=>notify(e.message)))
setInterval(()=>{if(!busy&&!document.hidden)refresh().catch(()=>{})},1200)
setInterval(updateTimers,250)
