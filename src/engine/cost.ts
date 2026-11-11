import type { Ingredient, Recipe, ResolvedPrice } from '../types';

/** Small tolerance so 2 × 500 g against a 1000 g pack is one pack, not two. */
const EPS = 1e-6;

export type PriceFn = (ingredientId: string) => ResolvedPrice | undefined;

/** Quantities for one recipe scaled to `servings`. */
export function scaleRecipe(recipe: Recipe, servings: number): Map<string, number> {
  const factor = servings / recipe.servings;
  const out = new Map<string, number>();
  for (const item of recipe.items) {
    out.set(item.ingredientId, (out.get(item.ingredientId) ?? 0) + item.qty * factor);
  }
  return out;
}

/** Merge ingredient needs across several recipes. */
export function mergeNeeds(recipes: Recipe[], servings: number): Map<string, number> {
  const total = new Map<string, number>();
  for (const r of recipes) {
    for (const [id, qty] of scaleRecipe(r, servings)) {
      total.set(id, (total.get(id) ?? 0) + qty);
    }
  }
  return total;
}

/** Whole packages needed to cover `need`. */
export function packsNeeded(need: number, packSize: number): number {
  if (need <= 0) return 0;
  if (packSize <= 0) return 1;
  return Math.ceil(need / packSize - EPS);
}

export interface CostLine {
  ingredientId: string;
  need: number;
  inPantry: boolean;
  packs: number;
  price?: ResolvedPrice;
  /** Cash spent at the register for this line. */
  bought: number;
  /** Value of the portion actually cooked. */
  used: number;
  /** Price is missing for this ingredient at this store. */
  missingPrice: boolean;
}

export interface CostSummary {
  lines: CostLine[];
  /** Total cash for packages bought (what the budget is checked against). */
  bought: number;
  /** Value of food actually used. */
  used: number;
  /** Bought minus used: what's left over in the fridge and cupboard. */
  leftover: number;
}

export function costNeeds(
  needs: Map<string, number>,
  priceOf: PriceFn,
  pantry: ReadonlySet<string>,
): CostSummary {
  const lines: CostLine[] = [];
  let bought = 0;
  let used = 0;
  for (const [ingredientId, need] of needs) {
    if (need <= 0) continue;
    const inPantry = pantry.has(ingredientId);
    const price = priceOf(ingredientId);
    if (inPantry || !price) {
      lines.push({
        ingredientId,
        need,
        inPantry,
        packs: 0,
        price,
        bought: 0,
        used: 0,
        missingPrice: !inPantry && !price,
      });
      continue;
    }
    const packs = packsNeeded(need, price.size);
    const b = packs * price.price;
    const u = price.size > 0 ? (need / price.size) * price.price : price.price;
    bought += b;
    used += u;
    lines.push({ ingredientId, need, inPantry, packs, price, bought: b, used: u, missingPrice: false });
  }
  return { lines, bought: round2(bought), used: round2(used), leftover: round2(bought - used) };
}

/** Cost of a week of recipes. */
export function weekCost(
  recipes: Recipe[],
  servings: number,
  priceOf: PriceFn,
  pantry: ReadonlySet<string>,
): CostSummary {
  return costNeeds(mergeNeeds(recipes, servings), priceOf, pantry);
}

/** Proportional (used) cost of one recipe, for cards and sorting. */
export function recipeUsedCost(
  recipe: Recipe,
  servings: number,
  priceOf: PriceFn,
  pantry: ReadonlySet<string>,
): number {
  return costNeeds(scaleRecipe(recipe, servings), priceOf, pantry).used;
}

export const round2 = (x: number) => Math.round(x * 100) / 100;

/** Convenience: build a PriceFn from a resolver and ingredient table. */
export function makePriceFn(
  ingredients: Record<string, Ingredient>,
  resolve: (ing: Ingredient) => ResolvedPrice,
): PriceFn {
  const cache = new Map<string, ResolvedPrice>();
  return (id) => {
    const hit = cache.get(id);
    if (hit) return hit;
    const ing = ingredients[id];
    if (!ing) return undefined;
    const p = resolve(ing);
    cache.set(id, p);
    return p;
  };
}
