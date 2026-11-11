import type { Unit } from '../types';

export const money = (x: number) => `$${x.toFixed(2)}`;

const G_PER_LB = 453.592;
const ML_PER_FLOZ = 29.5735;

/** US-friendly unit price: $/lb for weight, $/fl oz for volume, $/ea for pieces. */
export function formatUnitPrice(perBaseUnit: number, unit: Unit): string {
  if (unit === 'g') return `${money(perBaseUnit * G_PER_LB)}/lb`;
  if (unit === 'ml') return `${money(perBaseUnit * ML_PER_FLOZ)}/fl oz`;
  return `${money(perBaseUnit)}/ea`;
}

/** Friendly quantity for shopping lists and recipes. */
export function formatQty(qty: number, unit: Unit): string {
  if (unit === 'each') {
    const r = Math.round(qty * 4) / 4;
    return `${r % 1 === 0 ? r : r.toFixed(2).replace(/0$/, '')}`;
  }
  if (unit === 'g') {
    if (qty >= 454 * 0.9) return `${(qty / G_PER_LB).toFixed(1).replace(/\.0$/, '')} lb`;
    if (qty >= 28) return `${Math.round(qty / 28.35)} oz`;
    return `${Math.round(qty)} g`;
  }
  if (qty >= 240) return `${(qty / 240).toFixed(1).replace(/\.0$/, '')} cups`;
  if (qty >= 15) return `${Math.round(qty / 15)} tbsp`;
  return `${Math.max(1, Math.round(qty / 5))} tsp`;
}
