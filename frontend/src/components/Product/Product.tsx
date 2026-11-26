import catalogPhoto from '../../assets/catalog.jpg';
import type { Listing } from '../../functions/catalog';
import { rub } from '../../functions/format';
import { Button } from '../Button/Button';
import styles from './Product.module.css';

const photoPositions = ['0% 0%', '50% 0%', '100% 0%', '0% 100%', '50% 100%', '100% 100%'];

export function Product({ listing, busy, onOrder }: { listing: Listing; busy: boolean; onOrder: (id: number) => void }) {
    const { item, available, address, hint, timing, locations } = listing;
    const position = photoPositions[item.id - 1];
    return (
        <article className={styles.product}>
            <div className={styles.picture} aria-hidden="true"
                style={position ? { backgroundImage: 'url(' + catalogPhoto + ')', backgroundPosition: position } : undefined}>
                {!position && <span>{item.icon || '📦'}</span>}
            </div>
            <small>{item.category}</small>
            <h3>{item.name}</h3>
            <strong className={styles.price}>{rub(item.price)}</strong>
            <small>{hint}{address && ' · ' + address}</small>
            {timing && <small>{timing}</small>}
            {locations.length > 1 && <small>В наличии · {locations.map(point => point.name).join(' / ')}</small>}
            <Button primary disabled={busy} onClick={() => onOrder(item.id)}>{available ? 'Заказать' : 'Заказать у продавца'}</Button>
        </article>
    );
}
