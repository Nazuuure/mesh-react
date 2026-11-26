import {place, space, product} from '/model.mjs'
import {routeMap, roverCameras} from '/route-map.js'
import {
  root, state, start, render, post, hero, label, points, offices, panel,
  num, input, submit, reqRow, button, none, orderRow, stockLines, finance
} from '/app.js'

let office = sessionStorage.getItem('pvz-office') || 'p1'

function cargoRow(request) {
  return (request.order ? '<small>Заказ №' + request.order + '</small>' : '') + reqRow(request)
}

function approvalQueue(inbound) {
  const batches = Object.groupBy(inbound.filter(r => r.status === 'Согласование'), r => r.batch)
  return Object.entries(batches).map(([batch, items]) => {
    const liters = items.reduce((total, r) => total + product(state, r.product).liters * r.qty, 0)
    return `<div class="entry"><b>Партия №${batch} · ${num(liters)} л</b>
      ${items.map(cargoRow).join('')}
      <div class="actions">
        ${button('Согласовать приёмку', 'reply', {batch, place: office, accept: 1}, true)}
        ${button('Отклонить и перенаправить', 'reply', {batch, place: office, accept: 0})}
      </div>
    </div>`
  }).join('')
}

function dispatchQueue() {
  const requests = state.requests.filter(r => r.from === office && r.status === 'Погрузка')
  const trips = state.trips.filter(t => t.route[0] === office && t.status === 'Погрузка')
  const loads = Map.groupBy(requests, r => trips.find(t => t.ids.includes(r.id)) ?? r)
  return Array.from(loads, ([load, items]) => `<div class="entry">
    ${load.robot ? '<b>Рейс №' + load.id + '</b>' : ''}
    ${items.map(cargoRow).join('')}
    ${button('Подтвердить отправку', 'ship', {request: items[0].id, place: office}, true)}
  </div>`).join('')
}

function arrivalQueue(inbound) {
  return inbound.filter(r => ['Погрузка', 'В пути', 'Разгрузка'].includes(r.status)).map(r => {
    const action = r.status === 'Погрузка'
      ? '<small>Ожидает отправки</small>'
      : button('Подтвердить получение', 'receive', {
          request: r.id, place: office, 'ready-at': r.eta || 0
        }, true)
    return `<div class="entry">${cargoRow(r)}${action}</div>`
  }).join('')
}

function pvz() {
  const sites = offices()
  if (!sites.some(site => site.id === office)) office = sites[0].id
  const point = place(state, office)
  const volume = space(state, office)
  const orders = state.orders.filter(o => o.loc === office)
  const inbound = state.requests.filter(r => r.target === office)
  const ready = orders.filter(o => o.status === 'Готов к выдаче')
  const history = orders.filter(o => ['Выдан', 'Возвращён'].includes(o.status)).reverse()

  return hero('Рабочее место ПВЗ', 'Выдача заказов, приёмка и отправка грузов.',
    label('Работаю в пункте', `<select id="office">${points(sites, office)}</select>`)) +
    `<div class="cols">
      ${panel('Готовы к выдаче', ready.map(o => orderRow(o, office)).join('') || none('Заказов к выдаче нет'))}
      ${panel('Запросы на приёмку', approvalQueue(inbound) || none('Входящих запросов нет'))}
      ${panel('Грузы к отправке', dispatchQueue() || none('Грузов к отправке нет'))}
      ${panel('Ожидаемые поступления', arrivalQueue(inbound) || none('Ожидаемых поступлений нет'))}
    </div>` +
    routeMap(state, office) + roverCameras(state, office) +
    panel('Выданные заказы и возвраты', history.map(o => orderRow(o, office)).join('') || none('Выданных заказов нет')) +
    panel('Вместимость мини-склада', `<div class="row">
      <p><b class="stat">${num(volume.free)} л</b> свободно · занято ${num(volume.used)} л · под заявки ${num(volume.held)} л · зона выдачи отдельно ${num(volume.pickup)} л</p>
      <form class="form" data-form="capacity">${input('value', 'Вместимость, л', point.capacity, 0)}${submit('Сохранить')}</form>
    </div>`) +
    `<div class="cols">${panel('Остатки', stockLines(office))}${panel('Экономика ПВЗ', finance(office))}</div>`
}

root.onchange = e => {
  if (e.target.id !== 'office') return
  office = e.target.value
  sessionStorage.setItem('pvz-office', office)
  render()
  root.querySelector('#office').focus()
}

root.onsubmit = e => {
  e.preventDefault()
  post({type: 'capacity', place: office, value: new FormData(e.target).get('value')})
}

start(pvz)
