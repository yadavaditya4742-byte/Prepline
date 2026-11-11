import type { Ingredient } from '../types';
import { G_PER, ML_PER, toBase, type SizeUnit } from './sizes';

/** Units a person can type in a recipe (superset of pack units). */
export type RecipeUnit = SizeUnit | 'cup' | 'tbsp' | 'tsp' | 'clove' | 'can' | 'bunch' | 'inch' | 'pinch' | 'handful' | 'slice' | 'piece';

/** Typical weight of one piece, for ingredients bought by weight. */
const PIECE_G: Record<string, number> = {
  onion: 150, 'red-onion': 150, tomato: 120, potato: 200, 'sweet-potato': 250, 'bell-pepper': 150, carrot: 70, cucumber: 300,
  zucchini: 200, eggplant: 450, cauliflower: 600, cabbage: 900, 'chicken-breast': 250, 'chicken-thigh': 120, salmon: 150,
  cod: 150, tilapia: 120, avocado: 150, 'green-chili': 5, jalapeno: 15, mushroom: 18, 'pork-chop': 170, scallion: 15, celery: 40,
  'bok-choy': 100, butternut: 1100,
};

const GENERIC_CUP_G = 150;
const SPICE_TSP_G = 2.5;

/** grams (or ml) in one cup of this ingredient. */
function perCup(ing: Ingredient): number {
  if (ing.unit === 'ml') return ML_PER.cup;
  if (ing.gPerCup) return ing.gPerCup;
  return ing.aisle === 'Spices' ? SPICE_TSP_G * 48 : GENERIC_CUP_G;
}

/**
 * Convert a typed amount + unit to the ingredient's base unit.
 * Returns the base quantity and whether we had to guess.
 */
export function toBaseQty(ing: Ingredient, amount: number, unit: RecipeUnit | null): { qty: number; guessed: boolean } {
  if (!Number.isFinite(amount) || amount <= 0) return { qty: 0, guessed: true };
  const u = unit;

  // Kitchen measures use the ingredient's own density (a cup of rice ≠ a cup of water).
  if (u === 'cup' || u === 'tbsp' || u === 'tsp') {
    const cups = u === 'cup' ? amount : u === 'tbsp' ? amount / 16 : amount / 48;
    if (ing.unit === 'each') return { qty: Math.max(1, Math.round(cups * 2)), guessed: true };
    return { qty: cups * perCup(ing), guessed: !ing.gPerCup && ing.unit !== 'ml' };
  }

  // Direct weight / volume / count units
  if (u && (u in G_PER || u in ML_PER || u === 'ct')) {
    const base = toBase(amount, u as SizeUnit);
    if (base.unit === ing.unit) return { qty: base.amount, guessed: false };
    // weight given for a volume ingredient (or vice versa): assume water-like density
    if (base.unit !== 'each' && ing.unit !== 'each') return { qty: base.amount, guessed: true };
    if (base.unit === 'each' && ing.unit === 'g') return { qty: amount * (PIECE_G[ing.id] ?? 100), guessed: !(ing.id in PIECE_G) };
    // weight/volume for a counted ingredient
    return { qty: amount, guessed: true };
  }

  if (u === 'can') {
    if (ing.unit === 'each') return { qty: amount, guessed: true };
    return { qty: amount * (ing.aisle === 'Canned & Jarred' || ing.aisle === 'Beans & Lentils' ? ing.base.size : 425), guessed: false };
  }
  if (u === 'clove') return { qty: amount * 5, guessed: ing.id !== 'garlic' };
  if (u === 'inch') return { qty: amount * 10, guessed: ing.id !== 'ginger' };
  if (u === 'pinch') return { qty: amount * 0.5, guessed: false };
  if (u === 'handful') return { qty: amount * 30, guessed: true };
  if (u === 'bunch') return { qty: amount * (ing.unit === 'each' ? 1 : ing.base.size), guessed: false };
  if (u === 'slice') return { qty: ing.unit === 'each' ? amount : amount * 30, guessed: ing.unit !== 'each' };

  // No unit or "piece": a count
  if (ing.unit === 'each') return { qty: amount, guessed: false };
  if (ing.id in PIECE_G) return { qty: amount * PIECE_G[ing.id], guessed: false };
  return { qty: amount * 100, guessed: true };
}

/** Units offered in the recipe editor for an ingredient. */
export function editorUnits(ing: Ingredient): RecipeUnit[] {
  if (ing.unit === 'each') return ['ct'];
  if (ing.unit === 'ml') return ['ml', 'cup', 'tbsp', 'tsp', 'fl oz', 'l'];
  const list: RecipeUnit[] = ['g', 'oz', 'lb', 'cup', 'tbsp', 'tsp'];
  if (ing.id in PIECE_G) list.push('piece');
  if (ing.aisle === 'Canned & Jarred' || ing.aisle === 'Beans & Lentils') list.push('can');
  return list;
}

/** Friendly editor default for an existing base quantity. */
export function editorDefault(ing: Ingredient, qty: number): { amount: number; unit: RecipeUnit } {
  const round = (x: number) => Math.round(x * 100) / 100;
  if (ing.unit === 'each') return { amount: round(qty), unit: 'ct' };
  if (ing.unit === 'ml') return qty >= 120 ? { amount: round(qty / ML_PER.cup), unit: 'cup' } : { amount: round(qty / 15), unit: 'tbsp' };
  if (ing.aisle === 'Spices' && qty < 30) return { amount: round(qty / (perCup(ing) / 48)), unit: 'tsp' };
  return { amount: Math.round(qty), unit: 'g' };
}
