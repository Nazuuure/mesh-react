import type { ReactNode } from 'react';
import { mapPoint } from '../../functions/map';
import type { Place } from '../../types';
import styles from './CityMap.module.css';

const blocks = Array.from({ length: 8 }, (_, column) =>
    Array.from({ length: 6 }, (_, row) => [12 + column * 82, 12 + row * 48] as const)).flat();

export function CityMap({ points, city, caption, background, children }: {
    points: Place[];
    city: string;
    caption: string;
    background?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <figure className={styles.city}>
            <figcaption><strong>{city}</strong><small>Условная схема города</small></figcaption>
            <svg viewBox="0 0 610 310" role="img" aria-label={caption}>
                <rect width="610" height="310" fill="#faf8f3" />
                {blocks.map(([x, y]) => <rect key={x + ':' + y} x={x} y={y} width="67" height="34" rx="6" fill={(x + y) % 3 ? '#e4e2e0' : '#d1e5d6'} />)}
                <path d="M-10 75 Q140 140 265 86 T630 72" fill="none" stroke="#bbdce8" strokeWidth="15" />
                {background}
                {points.map(point => {
                    const [x, y] = mapPoint(point);
                    return (
                        <g key={point.id}>
                            <circle cx={x} cy={y} r="7" fill="#49266c" stroke="white" strokeWidth="3" />
                            <text x={x} y={y + 22} textAnchor="middle">{point.name}</text>
                        </g>
                    );
                })}
                {children}
            </svg>
        </figure>
    );
}
