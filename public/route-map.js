import {esc} from '/app.js'

export function routeMap(state, office) {
 const active = state.trips.filter(trip =>
   ['Погрузка','В пути','Разгрузка'].includes(trip.status) &&
   (!office || trip.route.includes(office)))
 const cards = active.map(trip => {
   const requests = state.requests.filter(row => trip.ids.includes(row.id))
   const stops = trip.route.map((id, index) => {
     const point = state.places.find(place => place.id === id)
     const row = index ? requests.find(request => request.target === id) : requests[0]
     return {name:point.name, x:30+point.x*50, y:15+point.y*24, at:(index ? row?.eta : row?.sentAt) || 0}
   })
   const path = stops.map(p => p.x+','+p.y).join(' ')
   const pins = stops.map((p,i) => `<circle cx="${p.x}" cy="${p.y}" r="8" fill="#54278f"/><text x="${p.x}" y="${p.y-12}" text-anchor="middle">${i+1}</text>`).join('')
   return `<article class="entry"><b>Рейс №${trip.id} · ${esc(trip.robot)}</b> · ${esc(trip.status)}
     <svg viewBox="0 0 300 165" style="display:block;width:100%;max-width:420px" role="img" aria-label="Схема маршрута ровера">
     <polyline points="${path}" fill="none" stroke="#9863b6" stroke-width="4"/>${pins}
     <circle data-rover='${JSON.stringify(stops.map(p=>[p.x,p.y,p.at]))}' cx="${stops[0].x}" cy="${stops[0].y}" r="5" fill="#ffae25" stroke="#382511"/></svg>
     <small>Маркер показывает расчётное положение ровера</small>
     <ol>${stops.map(p=>'<li>'+esc(p.name)+'</li>').join('')}</ol></article>`
 })
 return '<section class="panel"><h3>Карта рейсов роверов</h3>'+(cards.join('') || '<p class="muted">Активных рейсов нет</p>')+'</section>'
}

export function updateRovers(root, now) {
 for (const marker of root.querySelectorAll('[data-rover]')) {
   const stops = JSON.parse(marker.dataset.rover)
   let [x,y,start] = stops[0]
   for (const [nextX,nextY,end] of stops.slice(1)) {
     if (!end || end <= start) break
     const fraction = Math.min(1, Math.max(0, (now-start)/(end-start)))
     x += (nextX-x)*fraction
     y += (nextY-y)*fraction
     if (fraction < 1) break
     start = end
   }
   marker.setAttribute('cx', x)
   marker.setAttribute('cy', y)
 }
}
