import type { Unit } from '../types';

/*
 * Package-size parsing and unit conversion, shared by the price editor and the
 * Kroger live-price job. Everything converts to the ingredient's base unit:
 * grams, millilitres or pieces.
 */

export const G_PER = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 } as const;
export const ML_PER = { ml: 1, l: 1000, 'fl oz': 29.5735, cup: 236.588, qt: 946.353, gal: 3785.41, pt: 473.176 } as const;

export type SizeUnit = keyof typeof G_PER | keyof typeof ML_PER | 'ct';

export interface ParsedSize {
  amount: number;
  unit: Unit;
}

const UNIT_ALIASES: [RegExp, SizeUnit][] = [
  [/^(fl\.?\s*oz|fluid\s*ounces?)$/, 'fl oz'],
  [/^(oz|ounces?)$/, 'oz'],
  [/^(lbs?|pounds?)$/, 'lb'],
  [/^(g|grams?)$/, 'g'],
  [/^(kg|kilograms?)$/, 'kg'],
  [/^(ml|milliliters?|millilitres?)$/, 'ml'],
  [/^(l|liters?|litres?|ltr)$/, 'l'],
  [/^(gal|gallons?)$/, 'gal'],
  [/^(qt|quarts?)$/, 'qt'],
  [/^(pt|pints?)$/, 'pt'],
  [/^(cups?)$/, 'cup'],
  [/^(ct|count|each|ea|pk|pack|pcs?|pieces?)$/, 'ct'],
];

function aliasUnit(raw: string): SizeUnit | null {
  const u = raw.trim().toLowerCase();
  for (const [re, unit] of UNIT_ALIASES) if (re.test(u)) return unit;
  return null;
}

function parseNumber(raw: string): number {
  const s = raw.trim();
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  return Number(s);
}

/** Convert an amount in a size unit to base units. */
export function toBase(amount: number, unit: SizeUnit): ParsedSize {
  if (unit === 'ct') return { amount, unit: 'each' };
  if (unit in G_PER) return { amount: amount * G_PER[unit as keyof typeof G_PER], unit: 'g' };
  return { amount: amount * ML_PER[unit as keyof typeof ML_PER], unit: 'ml' };
}

/**
 * Parse sizes like "3 lb", "16 oz", "1/2 gal", "64 fl oz", "12 ct",
 * "2 x 14 oz", "1.5 lbs", "500 g". Returns null if nothing usable is found.
 */
export function parseSize(text: string): ParsedSize | null {
  const t = text.toLowerCase().replace(/,/g, ' ');
  // "6 x 16 oz" / "6 ct / 16 oz"-style multipacks
  const multi = t.match(/(\d+(?:\.\d+)?)\s*(?:x|×|ct\s*\/|pk\s*\/|-pack of)\s*(\d+(?:\.\d+)?)\s*([a-z. ]+?)\b(?:$|[^a-z])/);
  if (multi) {
    const u = aliasUnit(multi[3]);
    if (u && u !== 'ct') {
      const one = toBase(Number(multi[2]), u);
      return { amount: one.amount * Number(multi[1]), unit: one.unit };
    }
  }
  const re = /(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(fl\.?\s*oz|fluid\s*ounces?|[a-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const u = aliasUnit(m[2]);
    if (!u) continue;
    const n = parseNumber(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    return toBase(n, u);
  }
  return null;
}

/** Units offered in the editor for each base unit. */
export const EDITOR_UNITS: Record<Unit, SizeUnit[]> = {
  g: ['lb', 'oz', 'g', 'kg'],
  ml: ['fl oz', 'gal', 'qt', 'l', 'ml'],
  each: ['ct'],
};

/** Best display unit for a base amount (for the editor's default). */
export function bestUnit(amount: number, unit: Unit): { value: number; unit: SizeUnit } {
  const round = (x: number) => Math.round(x * 100) / 100;
  if (unit === 'each') return { value: round(amount), unit: 'ct' };
  if (unit === 'g') {
    if (amount >= G_PER.lb * 0.99) return { value: round(amount / G_PER.lb), unit: 'lb' };
    return { value: round(amount / G_PER.oz), unit: 'oz' };
  }
  if (amount >= ML_PER.gal * 0.99) return { value: round(amount / ML_PER.gal), unit: 'gal' };
  return { value: round(amount / ML_PER['fl oz']), unit: 'fl oz' };
}

export function sizeLabel(value: number, unit: SizeUnit): string {
  const v = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return unit === 'ct' ? `${v} ct` : `${v} ${unit}`;
}
