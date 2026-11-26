import {categories,place,source} from '/model.mjs'

import {$, root, state, start, render, post, label, points, offices, hero, panel, orderRow, chips, name, rub, esc, none} from '/app.js'

let destination='p2', filter='Все', query=''

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


$('#lookup').onsubmit=e=>{e.preventDefault();query=$('#query').value.trim();filter='Все';if(state)render()}
$('#query').oninput=e=>{query=e.target.value.trim();if(state)render()}
root.onchange=e=>{if(e.target.id==='destination'){destination=e.target.value;render()}}
root.onclick=e=>{
 const b=e.target.closest('button[data-action]')
 if(b?.dataset.action==='filter'){e.preventDefault();filter=b.dataset.value;render()}
 if(b?.dataset.action==='order'){e.preventDefault();post({type:'order', product:b.dataset.product, to:destination})}
}

start(buyer)
