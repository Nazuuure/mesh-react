import {routePosition} from '/model.mjs'
import {esc} from '/app.js'

const position = p => [60+p.x*89, 22+p.y*48]
const activeTrips = state => state.trips.filter(t => ['Погрузка','В пути','Разгрузка'].includes(t.status))

function cityMap(points, city, overlay, caption) {
 const blocks = []
 for(let x=12;x<590;x+=82){
   for(let y=12;y<296;y+=48){
     blocks.push(`<rect x="${x}" y="${y}" width="67" height="34" rx="6" fill="${(x+y)%3?'#e4e2e0':'#d1e5d6'}"/>`)
   }
 }
 return `<figure class="city-map"><figcaption><strong>${esc(city)}</strong><span>Условная схема города</span></figcaption>
 <svg viewBox="0 0 610 310" role="img" aria-label="${esc(caption)}"><rect width="610" height="310" fill="#faf8f3"/>${blocks.join('')}
 <path d="M-10 75 Q140 140 265 86 T630 72" fill="none" stroke="#bbdce8" stroke-width="15"/>
 ${overlay.background || ''}${points.map(p=>{
   const [x,y]=position(p)
   return `<circle cx="${x}" cy="${y}" r="7" fill="#49266c" stroke="white" stroke-width="3"/>
   <text x="${x}" y="${y+22}" text-anchor="middle">${esc(p.name)}</text>`
 }).join('')}${overlay.front || ''}</svg></figure>`
}

export function demandMap(state, city, category) {
 const points=state.places.filter(p=>p.id!=='hub' && p.city===city)
 const stats=points.map(p=>{
   const history=state.history.find(h=>h.place===p.id && h.category===category)?.count || 0
   const recent=state.orders.filter(o=>o.to===p.id && state.products.find(i=>i.id===o.product)?.category===category).length
   return {p,history,recent,count:history+recent}
 }).sort((a,b)=>b.count-a.count)
 const peak=Math.max(1,...stats.map(row=>row.count))
 const background=stats.map(({p,count})=>{
   const [x,y]=position(p), intensity=count/peak
   return [1,.72,.44].map(scale=>`<circle cx="${x}" cy="${y}" r="${(16+42*intensity)*scale}" fill="#cc3880" opacity="${.07+.23*intensity}"/>`).join('')
 }).join('')
 return cityMap(points,city,{background},'Спрос по пунктам выдачи')+
 `<small>Чем больше и темнее пятно, тем больше заказов в выбранной категории.</small>
 <table class="demand-table"><thead><tr><th>Пункт</th><th>Демоистория</th><th>Новые заказы</th><th>Всего</th></tr></thead>
 <tbody>${stats.map(({p,history,recent,count})=>`<tr><th>${esc(p.name)}</th><td>${history}</td><td>${recent}</td><td><b>${count}</b></td></tr>`).join('')}</tbody></table>`
}

export function routeMap(state, office) {
 const points=state.places.filter(p=>p.id!=='hub')
 const cities=[...new Set(points.filter(p=>!office||p.id===office).map(p=>p.city))]
 return '<section class="panel"><h3>Карта рейсов роверов</h3>'+cities.map(city=>{
   const local=points.filter(p=>p.city===city)
   const trips=activeTrips(state).filter(t=>local.some(p=>p.id===t.route[0]) && (!office||(t.route.includes(office)||t.incident?.office===office)))
   let background='',front=''
   const rows=trips.map(trip=>{
     const requests=state.requests.filter(r=>trip.ids.includes(r.id))
     const stops=trip.route.map((id,i)=>{
       const point=points.find(p=>p.id===id)
       const time=i?requests.find(r=>r.target===id)?.eta:requests[0]?.sentAt
       return [...position(point),time||0]
     })
     const color=trip.robot==='R-01'?'#753aaa':'#137d77'
     const [x,y]=stops[0]
     background+=`<polyline points="${stops.map(([x,y])=>x+','+y).join(' ')}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="8 3"/>`
     front+=`<circle data-paused-at="${trip.incident && trip.incident.resumedAt==null?trip.incident.at:''}" data-rover='${JSON.stringify(stops)}' cx="${x}" cy="${y}" r="8" fill="${color}" stroke="white" stroke-width="2"><title>${esc(trip.robot)}</title></circle>`
     return `<div class="entry"><b style="color:${color}">${esc(trip.robot)} · рейс №${trip.id}</b> · ${trip.incident && trip.incident.resumedAt==null?'Застрял · курьер выслан':esc(trip.status)}<br>${trip.route.map(id=>esc(points.find(p=>p.id===id).name)).join(' → ')} · ${requests.reduce((n,r)=>n+r.qty,0)} уп.</div>`
   })
   return cityMap(local,city,{background,front},'Расчётные маршруты роверов')+(rows.length?'<small>Пунктир — маршрут, цветная точка — расчётное положение ровера.</small>'+rows.join(''):'<small>Активных рейсов нет</small>')
 }).join('')+'</section>'
}

export function roverCameras(state, office) {
 const trips=activeTrips(state).filter(t=>(t.route.includes(office)||t.incident?.office===office))
 return '<section class="panel"><h3>Камера ровера</h3>'+(trips.length?trips.map(t=>{
   const url=state.cameraUrls?.[t.robot]
   return `<div class="entry"><b>${esc(t.robot)} · рейс №${t.id}</b>${url?`<video class="rover-camera" controls muted playsinline preload="none" src="${esc(url)}"></video>`:'<p class="muted">Видеопоток не подключён</p>'}</div>`
 }).join(''):'<p class="muted">У выбранного ПВЗ сейчас нет активного рейса.</p>')+'</section>'
}

export function updateRovers(root, now) {
 for (const marker of root.querySelectorAll('[data-rover]')) {
   const stops = JSON.parse(marker.dataset.rover)
   const {x,y}=routePosition(stops, Number(marker.dataset.pausedAt)||now)
   marker.setAttribute('cx', x)
   marker.setAttribute('cy', y)
 }
}
