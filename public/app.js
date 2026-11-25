import {place,product,freeStock} from '/model.mjs'
const $=s=>document.querySelector(s),root=$('#main')
const role=document.documentElement.dataset.site
let skew=0
let state, busy=false, timer, view, afterPost
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
function orderRow(o,office){
 const p=product(state,o.product)
 let extra=''
 if(!office&&o.status==='Предложение')extra=`<div class="notice">Товар уже в ${loc(o.loc)}. Заберёте здесь?<div class="actions">${button('Заберу здесь','choice',{order:o.id,accept:1},true)}${button('Доставить в выбранный ПВЗ','choice',{order:o.id,accept:0})}</div></div>`
 if(office&&o.status==='Готов к выдаче')extra=button('Подтвердить выдачу','issue',{order:o.id,place:office},true)
 if(office&&o.status==='Выдан')extra=button('Принять возврат','return',{order:o.id,place:office})
 const transport=state.requests.find(r=>r.order===o.id&&r.status==='В пути')
 return `<div class="entry"><div class="row"><strong>№${o.id} · ${esc(p.name)}</strong>${tag(o.status)}</div><p class="muted">Выбран ${loc(o.to)} · ${o.status==='В пути'?'товар в рейсе':'место учёта: '+loc(o.loc)}</p>${transport?progress(transport):''}${extra}</div>`
}
function stockLines(where){
 return state.products.filter(p=>Object.entries(p.stock).some(([id,n])=>n>0&&(!where||where===id))).map(p=>`<div class="entry"><b>${esc(p.name)}</b> <span class="muted">· ${p.dims.map(num).join(' × ')} см · ${num(p.liters)} л</span><br>${Object.entries(p.stock).filter(([id,n])=>n>0&&(!where||where===id)).map(([id,n])=>`${loc(id)}: ${freeStock(state,p,id)} свободно из ${n}`).join(' · ')}</div>`).join('')||none('Полка пока пуста')
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
function finance(office){
 const list=state.ledger.filter(l=>!office||l.loc===office)
 if(!list.length)return none('Расчёт появится после выдачи первого заказа')
 return list.slice().reverse().map(l=>`<div class="entry"><b>Заказ №${l.order} · ${rub(office?l.pvz:l.seller)} прибыли</b><br><span class="muted">${office?`Начислено ${rub(l.payout)} · труд ${rub(12)} · хранение в начислении ${rub(l.storage)}`:`Продажа ${rub(l.price)} · себестоимость ${rub(l.price*.6)} · комиссия ${rub(l.price*.1)} · ПВЗ ${rub(l.payout)} · рейс ${rub(l.transport)}`}</span>${state.orders.find(o=>o.id===l.order).status==='Возвращён'?' · возврат':''}</div>`).join('')
}
function render(){document.body.dataset.role=role;root.innerHTML=view();$('#clock').textContent='День '+state.day;updateTimers()}
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
 try{const r=await fetch('/'+role+'/api/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...a,version:state.version})});const result=await r.json();if(!r.ok)throw Error(result.error);skew=result.serverNow-Date.now();state=result;afterPost?.();render();notify('Готово')}
 catch(e){notify(e.message);await refresh().catch(()=>{})}finally{busy=false}
}
function start(renderPage, onSuccess) {
 view = renderPage
 afterPost = onSuccess
 root.addEventListener('click', e => {
   const button = e.target.closest('button[data-action]')
   if (!button || e.defaultPrevented) return
   const {action, ...args} = button.dataset
   if ('accept' in args) args.accept = args.accept === '1'
   post({type: action, ...args})
 })
 refresh().catch(e=>notify(e.message))
window.addEventListener('focus',()=>refresh().catch(e=>notify(e.message)))
setInterval(()=>{if(!busy&&!document.hidden)refresh().catch(()=>{})},1200)
setInterval(updateTimers,250)
}
export { $, root, state, start, render, post, notify, esc, num, rub, name, loc, label, opts, offices, points, input, field, button, submit, panel, none, tag, chips, hero, orderRow, stockLines, deliveries, reqRow, finance }
