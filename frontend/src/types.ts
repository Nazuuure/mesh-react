export type Role = 'buyer' | 'seller' | 'pvz' | 'wb';

export interface Place {
    id: string;
    name: string;
    city: string;
    address?: string;
    x: number;
    y: number;
    capacity: number;
}

export interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    liters: number;
    dims: number[];
    weightKg?: number;
    stock: Record<string, number>;
    icon?: string;
}

export type OrderStatus = 'Предложение' | 'Доставка' | 'В пути' | 'Готов к выдаче' | 'Выдан' | 'Возвращён';

export interface Order {
    id: number;
    product: number;
    loc: string;
    to: string;
    status: OrderStatus;
}

export type RequestStatus = 'Новая' | 'Ожидает места' | 'Согласование' | 'Погрузка' | 'В пути' | 'Разгрузка' | 'Доставлено' | 'Отменено';

export interface Shipment {
    id: number;
    product: number;
    qty: number;
    from: string;
    to: string;
    order: number | null;
    kind: 'Робот' | 'Магистраль';
    status: RequestStatus;
    target?: string | null;
    batch?: number;
    purpose: 'pickup' | 'storage';
    sentAt?: number;
    eta?: number;
    pausedAt?: number;
}

export interface Trip {
    id: number;
    robot: string;
    route: string[];
    ids: number[];
    status: 'Погрузка' | 'В пути' | 'Разгрузка' | 'Завершён' | 'Сбой';
    incident?: { office: string; at: number; resumedAt?: number };
}

export interface LedgerEntry {
    order: number;
    loc: string;
    price: number;
    storage: number;
    payout: number;
    transport: number;
    pvz: number;
    seller: number;
    saving: number;
}

export interface MeshState {
    places: Place[];
    products: Product[];
    orders: Order[];
    requests: Shipment[];
    trips: Trip[];
    ledger: LedgerEntry[];
    history: { place: string; category: string; count: number }[];
    cameraUrls?: Record<string, string>;
    day: number;
    version: number;
    serverNow: number;
}

export type Action =
    | { type: 'order'; product: number; to: string }
    | { type: 'choice'; order: number; accept: boolean }
    | { type: 'product'; name: string; category: string; price: string; dims: string[]; qty: string; place: string; weightKg: string }
    | { type: 'restock' | 'transfer'; product: string; qty: string; place: string; to?: string }
    | { type: 'offer' | 'trip' | 'viaHub'; ids: number[]; purpose: string; place: string; robot: string }
    | { type: 'reply'; batch: number; place: string; accept: boolean }
    | { type: 'ship' | 'receive'; request: number; place: string }
    | { type: 'issue' | 'return'; order: number; place: string }
    | { type: 'stuck' | 'failure'; trip: number }
    | { type: 'rescue'; trip: number; place: string }
    | { type: 'capacity'; place: string; value: string }
    | { type: 'day' | 'reset' };

export type SendAction = (action: Action) => Promise<boolean>;
export type Option = readonly [value: string | number, label: string];
export type Stop = [x: number, y: number, time: number];

export interface CabinetProps {
    state: MeshState;
    send: SendAction;
    busy: boolean;
    offset: number;
}
