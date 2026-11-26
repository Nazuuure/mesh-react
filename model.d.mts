import type { MeshState, Place, Product, Shipment, Stop } from './frontend/src/types';

export const categories: string[];
export function travelSeconds(roverStop?: number): number;

export const rover: {
    liters: number;
    maxKg: number;
    minUnits: number;
    autoUnits: number;
    collectMilliseconds: number;
    idealMin: number;
    idealMax: number;
};

export function demandAt(state: MeshState, point: string, category: string): { history: number; orders: number; count: number };
export function freeStock(state: MeshState, item: Product, place: string): number;
export function source(state: MeshState, item: Product, target: string): Place | undefined;
export function packingLiters(dimensions: readonly (string | number)[]): number;
export function routePosition(stops: Stop[], now: number): { x: number; y: number };
export function loadKg(state: MeshState, rows: Shipment[]): number;
export function space(state: MeshState, place: string): { used: number; held: number; pickup: number; free: number };
