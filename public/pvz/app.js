import {routeMap} from '/route-map.js'
import {place,space,product} from '/model.mjs'

import {root, state, start, render, post, hero, label, points, offices, deliveries, panel, num, input, submit, reqRow, button, none, orderRow, stockLines, finance} from '/app.js'

let office='p1'

function pvz(){
 const q=place(state,office),v=space(state,office)
 const groups=Object.groupBy(state.requests.filter(r=>r.target===office&&r.status==='Согласование'),r=>r.batch)
 return hero('Рабочее место ПВЗ','Приём партий, выдача заказов и управление складом.',label('Работаю в пункте',`<select id="office">${points(offices(),office)}</select>`))+
 routeMap(state, office)+deliveries(office)+panel('Вместимость мини-склада',`<div class="row"><p><b class="stat">${num(v.free)} л</b> свободно · занято ${num(v.used)} л · под заявки ${num(v.held)} л · зона выдачи отдельно ${num(v.pickup)} л</p><form class="form" data-form="capacity">${input('value','Вместимость, л',q.capacity,0)}${submit('Сохранить')}</form></div>`)+
 panel('Запросы на приёмку',Object.entries(groups).map(([batch,list])=>`<div class="entry"><b>Партия №${batch} · ${num(list.reduce((n,r)=>n+product(state,r.product).liters*r.qty,0))} л</b>${list.map(reqRow).join('')}<div class="actions">${button('Принять партию','reply',{batch,accept:1},true)}${button('Отклонить и перенаправить','reply',{batch,accept:0})}</div></div>`).join('')||none('Входящих запросов нет'))+
 panel('Выдача и возвраты',state.orders.filter(o=>o.loc===office&&['Готов к выдаче','Выдан','Возвращён'].includes(o.status)).map(o=>orderRow(o,office)).join('')||none('Заказов к выдаче пока нет'))+
 `<div class="cols">${panel('Остатки',stockLines(office))}${panel('Экономика ПВЗ',finance(office))}</div>`
}


root.onchange=e=>{if(e.target.id==='office'){office=e.target.value;render()}}
root.onclick=e=>{
 const b=e.target.closest('button[data-action="reply"]')
 if(b){e.preventDefault();post({type:'reply',batch:b.dataset.batch,accept:b.dataset.accept==='1',place:office})}
}
root.onsubmit=e=>{
 e.preventDefault()
 post({type:'capacity',place:office,value:new FormData(e.target).get('value')})
}

start(pvz)
