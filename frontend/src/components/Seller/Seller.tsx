import { categories } from '../../../../model.mjs';
import { pointAddress, itemName, placeOptions, productOptions } from '../../functions/format';
import { useSeller } from '../../hooks/useSeller';
import shared from '../../styles/Shared.module.css';
import type { CabinetProps } from '../../types';
import { Button } from '../Button/Button';
import { DemandMap } from '../DemandMap/DemandMap';
import { Field } from '../Field/Field';
import { Finances } from '../Finances/Finances';
import { Hero } from '../Hero/Hero';
import { ListingForm } from '../ListingForm/ListingForm';
import { Panel } from '../Panel/Panel';
import { RequestCard } from '../RequestCard/RequestCard';
import { SelectField } from '../SelectField/SelectField';
import { Stock } from '../Stock/Stock';

export function Seller({ state, send, busy, offset }: CabinetProps) {
    const seller = useSeller(state, send);
    const waiting = state.orders.filter(order => order.status === 'Запрошен у продавца');
    const products = productOptions(state.products);
    const requests = state.requests.filter(request => !request.order).toReversed();

    return (
        <>
            <Hero title="Кабинет продавца" description="Размещение товара, остатки и спрос по пунктам выдачи." />
            {waiting.length>0 && <Panel title="Запросы покупателей" scroll>
                {waiting.map(order=><div key={order.id}>
                    <p>Заказ №{order.id} · {itemName(state,order.product)} · {pointAddress(state,order.to)}</p>
                    <Button disabled={busy} onClick={()=>void send({type:'restock',product:String(order.product),qty:'1',place:order.to})}>
                        Оприходовать 1 шт. в этом ПВЗ
                    </Button>
                </div>)}
            </Panel>}
            <Panel title="Город размещения и карта спроса">
                <div className={shared.form}>
                    <SelectField label="Город размещения" options={seller.cities.map(city => [city, city])}
                        value={seller.city} onChange={event => seller.setCity(event.target.value)} />
                    <SelectField label="Категория карты" options={categories.map(category => [category, category])}
                        value={seller.category} onChange={event => seller.setCategory(event.target.value)} />
                </div>
                <p>Город применяется к формам ниже. ПВЗ выбирается по спросу в категории товара и свободному месту.</p>
                <DemandMap state={state} city={seller.city} category={seller.category} />
            </Panel>
            <Panel title="Добавить карточку и оприходовать товар">
                <ListingForm city={seller.city} send={send} busy={busy} />
            </Panel>
            <Panel title="Пополнить остаток по карточке">
                <form className={shared.form} onSubmit={seller.restock}>
                    <SelectField label="Товар" name="product" options={products} />
                    <Field label="Добавить, шт." name="qty" type="number" defaultValue={1} min={1} required />
                    <Button type="submit" primary disabled={busy || !products.length}>Пополнить остаток</Button>
                </form>
            </Panel>
            <Panel title="Переместить товар">
                <form className={shared.form} onSubmit={seller.transfer}>
                    <SelectField label="Товар" name="product" options={products} value={seller.product?.id ?? ''}
                        onChange={event => seller.setProduct(Number(event.target.value))} />
                    <SelectField key={seller.product?.id} label="Откуда" name="place" options={placeOptions(seller.sources)} required />
                    <Field label="Упаковок" name="qty" type="number" defaultValue={3} min={1} required />
                    <Button type="submit" primary disabled={busy || !seller.sources.length}>Отправить заявку</Button>
                </form>
            </Panel>
            <div className={shared.columns}>
                <Panel title="Товар на полках" scroll><Stock state={state} /></Panel>
                <Panel title="Экономика продавца" scroll><Finances state={state} role="seller" /></Panel>
            </div>
            <Panel title="Заявки продавца" scroll>
                {requests.length ? requests.map(shipment => <RequestCard key={shipment.id} state={state} shipment={shipment} offset={offset} />)
                    : <p>Заявок пока нет</p>}
            </Panel>
        </>
    );
}
