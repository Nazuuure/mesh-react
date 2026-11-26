import {demandMap} from '/route-map.js'
import {categories,product,freeStock,packingLiters} from '/model.mjs'

import {$, root, state, start, render, post, hero, panel, label, opts, points, field, input, submit, offices, num, stockLines, finance, reqRow, none} from '/app.js'

let transferProduct=1, heatCity='Йошкар-Ола', heatCat='Электроника'

function listingForm() {
 const locations = state.places.map(({id, name, city}) => [id, `${city} · ${id === 'hub' ? name : `ПВЗ «${name}»`}`])
 return `<form data-form="product" class="form">
  ${label('Название','<input required maxlength="80" name="name" placeholder="Например, колонка">')}
  ${field('category','Категория',opts(categories.map(c=>[c,c])))}
  ${input('price','Цена, ₽',990)}
  ${input('l','Длина, см',10)}${input('w','Ширина, см',10)}${input('h','Высота, см',20)}
  <label>Объём упаковки<output id="liters">2 л</output></label>
  ${field('place','Место размещения',opts(locations,'p1'))}
  ${input('weightKg','Масса одной упаковки, кг',1,.001)}
  ${input('qty','Количество в этой точке, шт.',3,1,1)}
  ${submit('Добавить товар')}
 </form>`
}

function seller(){
 const p=product(state,transferProduct)||state.products[0]
 const stock=state.places.filter(q=>freeStock(state,p,q.id)>0)
 return hero('Кабинет продавца','Размещение товара, остатки и спрос по пунктам выдачи.')+
 panel('Добавить карточку и оприходовать товар',listingForm())+
 panel('Пополнить остаток по карточке',`<form data-form="restock" class="form">
  ${field('product','Товар',opts(state.products.map(item=>[item.id,item.name])))}
  ${field('place','Место размещения',points(state.places,'p1'))}
  ${input('qty','Добавить, шт.',1,1,1)}
  ${submit('Пополнить остаток')}
 </form>`)+
 panel('Переместить товар',`<form data-form="transfer" class="form">${label('Товар',`<select id="transferProduct" name="product">${opts(state.products.map(i=>[i.id,i.name]),p.id)}</select>`)}${field('place','Откуда',points(stock))}${field('to','Желаемый ПВЗ',points(offices(),'p2'))}${input('qty','Упаковок',3,1,1)}${submit('Отправить заявку')}</form>`)+
 panel('Спрос по категории',`<div class="row"><p class="muted">Заказы по желаемому ПВЗ · цвет темнее при большем спросе</p><div class="actions"><select aria-label="Город карты" id="heatCity">${opts([...new Set(offices().map(q=>q.city))].map(c=>[c,c]),heatCity)}</select><select id="heatCat" aria-label="Категория карты">${opts(categories.map(c=>[c,c]),heatCat)}</select></div></div>${demandMap(state,heatCity,heatCat)}`)+
 `<div class="cols">${panel('Товар на полках',stockLines())}${panel('Экономика продавца',finance())}</div>`+
 panel('Заявки продавца',state.requests.filter(r=>!r.order).slice().reverse().map(reqRow).join('')||none('Заявок пока нет'))
}

root.oninput=e=>{
 if(['l','w','h'].includes(e.target.name)){const f=e.target.form;try{$('#liters').textContent=packingLiters([f.l.value,f.w.value,f.h.value]).toLocaleString('ru-RU',{maximumSignificantDigits:8})+' л'}catch{$('#liters').textContent='Введите размеры'}}
}
root.onchange=e=>{
 const el=e.target
 switch(el.id){
  case 'transferProduct': transferProduct=+el.value;break
  case 'heatCat': heatCat=el.value;break
  case 'heatCity': heatCity=el.value;break
  default:return
 }
 render()
}
root.onsubmit=e=>{
 e.preventDefault()
 const f=e.target, a=Object.fromEntries(new FormData(f))
 if(f.dataset.form==='product')a.dims=[a.l,a.w,a.h]
 post({...a,type:f.dataset.form})
}

start(seller)
