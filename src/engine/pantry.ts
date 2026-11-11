import type { Ingredient } from '../types';

/**
 * Effective pantry: staples count as "have it" unless the user said otherwise;
 * anything the user toggled on counts too.
 */
export function effectivePantry(
  ingredients: Iterable<Ingredient>,
  explicit: ReadonlyMap<string, boolean>,
): Set<string> {
  const out = new Set<string>();
  for (const ing of ingredients) {
    const e = explicit.get(ing.id);
    if (e === true || (e === undefined && ing.staple)) out.add(ing.id);
  }
  return out;
}
