import { categories } from '../../../../model.mjs';
import { placeOptions } from '../../functions/format';
import { useBuyer } from '../../hooks/useBuyer';
import type { CabinetProps } from '../../types';
import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { SelectField } from '../SelectField/SelectField';
import { Hero } from '../Hero/Hero';
import { OrderCard } from '../OrderCard/OrderCard';
import { Product } from '../Product/Product';
import styles from './Buyer.module.css';

export function Buyer({ state, send, busy, offset }: CabinetProps) {
    const buyer = useBuyer(state);
    const { recommended, other } = buyer.catalog;
    const order = (product: number) => void send({ type: 'order', product, to: buyer.point.id });

    return (
        <>
            <Hero title="Товары рядом" description="Выберите пункт выдачи, чтобы увидеть, какие товары можно забрать быстрее.">
                <SelectField label="Мой пункт выдачи" options={placeOptions(buyer.points)}
                    value={buyer.point.id} onChange={event => buyer.select(event.target.value)} />
            </Hero>

            <details className={styles.orders}>
                <summary>Мои заказы · {buyer.orders.length}</summary>
                {buyer.orders.length ? (
                    <div className={styles.orderStrip} role="region" aria-label="Карточки заказов" tabIndex={0}>
                        {buyer.orders.map(order => (
                            <OrderCard key={order.id} order={order} state={state} send={send} busy={busy} offset={offset} />
                        ))}
                    </div>
                ) : <p>Заказов пока нет</p>}
            </details>

            <div className={styles.catalogHead}>
                <h2>Каталог</h2>
                <Field type="search" label="Поиск товаров" value={buyer.query}
                    placeholder="Название или категория" onChange={event => buyer.setQuery(event.target.value)} />
            </div>
            <div className={styles.filters}>
                {['Все', ...categories].map(category => (
                    <Button key={category} primary={category === buyer.category} aria-pressed={category === buyer.category}
                        onClick={() => buyer.setCategory(category)}>{category}</Button>
                ))}
            </div>

            {recommended.length > 0 && (
                <div>
                    <h3 className={styles.recommendations}>Рекомендуем для вашего ПВЗ</h3>
                    <div className={styles.grid}>
                        {recommended.map(listing => <Product key={listing.item.id} listing={listing} busy={busy} onOrder={order} />)}
                    </div>
                </div>
            )}
            {other.length > 0 && (
                <div className={styles.grid}>
                    {other.map(listing => <Product key={listing.item.id} listing={listing} busy={busy} onOrder={order} />)}
                </div>
            )}
            {!recommended.length && !other.length && <p>Товары не найдены. Измените запрос или категорию.</p>}
        </>
    );
}
