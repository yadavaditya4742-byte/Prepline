import type { Appliance, DietPreset, DietTag, Ingredient, Recipe, Settings } from '../types';

export const DIET_LABELS: Record<DietPreset, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian (no eggs)',
  eggetarian: 'Vegetarian + eggs',
  pescatarian: 'Vegetarian + eggs + fish',
  'chicken-fish': 'Chicken & fish',
  everything: 'Everything (incl. beef, lamb, pork)',
};

const ALLOWED: Record<DietPreset, DietTag[]> = {
  vegan: ['plant'],
  vegetarian: ['plant', 'dairy'],
  eggetarian: ['plant', 'dairy', 'egg'],
  pescatarian: ['plant', 'dairy', 'egg', 'fish'],
  'chicken-fish': ['plant', 'dairy', 'egg', 'fish', 'poultry'],
  everything: ['plant', 'dairy', 'egg', 'fish', 'poultry', 'meat'],
};

export const allowedTags = (diet: DietPreset): ReadonlySet<DietTag> => new Set(ALLOWED[diet]);

/** Diet tags a recipe contains. Unknown ingredients are treated as plant. */
export function recipeTags(recipe: Recipe, ingredients: Record<string, Ingredient>): Set<DietTag> {
  const tags = new Set<DietTag>();
  for (const it of recipe.items) tags.add(ingredients[it.ingredientId]?.diet ?? 'plant');
  return tags;
}

/** The strictest diet preset a recipe satisfies (for badges). */
export function recipeDiet(recipe: Recipe, ingredients: Record<string, Ingredient>): DietPreset {
  const tags = recipeTags(recipe, ingredients);
  const order: DietPreset[] = ['vegan', 'vegetarian', 'eggetarian', 'pescatarian', 'chicken-fish', 'everything'];
  return order.find((d) => [...tags].every((t) => ALLOWED[d].includes(t))) ?? 'everything';
}

export function fitsDiet(
  recipe: Recipe,
  diet: DietPreset,
  ingredients: Record<string, Ingredient>,
): boolean {
  const ok = allowedTags(diet);
  return recipe.items.every((it) => ok.has(ingredients[it.ingredientId]?.diet ?? 'plant'));
}

export function fitsAppliances(recipe: Recipe, have: readonly Appliance[]): boolean {
  return recipe.appliances.every((a) => have.includes(a));
}

export function hasExcluded(recipe: Recipe, excludes: readonly string[]): boolean {
  return recipe.items.some((it) => excludes.includes(it.ingredientId));
}

/** All filters the plan generator applies before scoring. */
export function recipeAllowed(
  recipe: Recipe,
  settings: Pick<Settings, 'diet' | 'appliances' | 'excludes'>,
  ingredients: Record<string, Ingredient>,
): boolean {
  return (
    fitsDiet(recipe, settings.diet, ingredients) &&
    fitsAppliances(recipe, settings.appliances) &&
    !hasExcluded(recipe, settings.excludes)
  );
}
