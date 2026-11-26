import {categories, freeStock, place, product, source} from '/model.mjs'

import {$, root, state, start, render, label, points, offices, hero, button, tag, chips, rub, esc, none} from '/app.js'

let destination='p2', filter='Все', query=''

function pickupAddress(id) {
 const point = place(state, id)
 const title = id === 'hub' ? point.name : `ПВЗ «${point.name}»`
 return esc(`${point.city}, ${title}${point.address ? `, ${point.address}` : ''}`)
}

function availability(from, to) {
 if (!from) return 'Нет в наличии'
 if (from.id === to.id) return `Готов к выдаче · ${pickupAddress(to.id)}`
 if (from.id !== 'hub' && from.city === to.city) return `В соседнем пункте · ${pickupAddress(from.id)}`
 return `Потребуется поставка · ${pickupAddress(from.id)}`
}

function orderRow(order) {
 const {id, loc, to, status} = order
 const request = state.requests.find(r => r.order === id && !['Доставлено', 'Отменено'].includes(r.status))
 let details

 if (status === 'Предложение') {
  details = `<div class="notice">
    <p>Товар можно забрать здесь · <strong>${pickupAddress(loc)}</strong></p>
    <p>Выбранный пункт выдачи · ${pickupAddress(to)}</p>
    <div class="actions">
      ${button('Заберу здесь', 'choice', {order: id, accept: 1}, true)}
      ${button('Доставить в выбранный ПВЗ', 'choice', {order: id, accept: 0})}
    </div>
  </div>`
 } else if (status === 'Доставка' || status === 'В пути') {
  const from = request?.from ?? loc
  const origin = from === 'hub' ? 'с хаба' : 'из пункта отправления'
  const delivery = status === 'В пути' ? `Товар отправлен ${origin}` : `Ожидается поставка ${origin}`
  details = `<p>${delivery} · ${pickupAddress(from)}</p>
    <p>Выбранный пункт выдачи · ${pickupAddress(to)}</p>`
  if (request?.status === 'В пути') {
   details += `<div class="journey" data-start="${request.sentAt}" data-end="${request.eta}">
     <progress max="100" aria-label="Ход доставки"></progress> <span></span>
   </div>`
  }
 } else {
  details = `<p>Пункт выдачи · <strong>${pickupAddress(loc)}</strong></p>`
 }

 return `<article class="entry"><div class="row"><strong>№${id} · ${esc(product(state, order.product).name)}</strong>${tag(status)}</div>${details}</article>`
}

function buyer(){
 const orders=state.orders.slice().reverse()
 const matches=state.products.filter(p=>(filter==='Все'||p.category===filter)&&(p.name+' '+p.category).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')))
 const routeArt='<div class="route-art" aria-hidden="true"><i></i><b></b><span></span></div>'
 return hero('Товары рядом','Выберите пункт выдачи, чтобы увидеть доступность и срок доставки.',routeArt+label('Мой пункт выдачи',`<select id="destination">${points(offices(),destination)}</select>`))+
 `<details id="buyer-orders" class="panel"${root.querySelector('#buyer-orders')?.open?' open':''}>
  <summary>Мои заказы · ${orders.length}</summary>
  ${orders.map(orderRow).join('') || none('Заказов пока нет')}
 </details>`+
 `<div class="head"><h2>Каталог</h2>${chips(['Все',...categories],filter,'filter')}</div><div class="grid">`+
 matches.map(p=>{
 const src=source(state,p,destination)
 const hint=availability(src,place(state,destination))
 const orderButton=src?button('Заказать','order',{product:p.id,to:destination},true):'<button type="button" class="primary" disabled>Заказать</button>'
 const availableOffices=offices().filter(point=>freeStock(state,p,point.id)>0)
 const locations=availableOffices.length>1?`<small>В наличии в ПВЗ · ${availableOffices.map(point=>esc(`${point.city}, ${point.name}`)).join(' / ')}</small>`:''
 return `<article class="card"><div class="art tile-${p.id>=1&&p.id<=6?p.id:'new'}"><span aria-hidden="true">${p.id>6?esc(p.icon || '📦'):''}</span></div><div class="cat">${p.category}</div><h3>${esc(p.name)}</h3><div class="price">${rub(p.price)}</div><small>${hint}</small>${locations}${orderButton}</article>`}).join('')+(matches.length?'':none('Товары не найдены. Измените запрос или категорию.'))+'</div>'
}


$('#lookup').onsubmit=e=>{e.preventDefault();query=$('#query').value.trim();filter='Все';if(state)render()}
$('#query').oninput=e=>{query=e.target.value.trim();if(state)render()}
root.onchange=e=>{if(e.target.id==='destination'){destination=e.target.value;render()}}
root.onclick=e=>{
 const b=e.target.closest('button[data-action]')
 if(b?.dataset.action==='filter'){e.preventDefault();filter=b.dataset.value;render()}
}

start(buyer)
