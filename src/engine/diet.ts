import type { Appliance, Cuisine, DietPreset, DietTag, Ingredient, Recipe, Settings } from '../types';

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

export const allowedTags = (diet: DietPreset | readonly DietTag[]): ReadonlySet<DietTag> =>
  new Set<DietTag>(['plant', ...(typeof diet === 'string' ? ALLOWED[diet] : diet)]);

/** The food groups a preset includes (plants are always in). */
export const presetTags = (diet: DietPreset): DietTag[] => [...ALLOWED[diet]];

/** Food groups people can mix and match. Plants are always included. */
export const FOOD_GROUPS: { tag: Exclude<DietTag, 'plant'>; label: string; emoji: string; hint: string }[] = [
  { tag: 'dairy', label: 'Dairy', emoji: '🧀', hint: 'paneer, yogurt, milk, cheese' },
  { tag: 'egg', label: 'Eggs', emoji: '🥚', hint: '' },
  { tag: 'fish', label: 'Fish & seafood', emoji: '🐟', hint: 'salmon, tuna, shrimp' },
  { tag: 'poultry', label: 'Chicken & turkey', emoji: '🍗', hint: '' },
  { tag: 'meat', label: 'Beef, lamb & pork', emoji: '🥩', hint: '' },
];

/** The preset that matches a set of food groups exactly, if any. */
export function matchingPreset(eats: readonly DietTag[]): DietPreset | null {
  const want = allowedTags(eats);
  return (
    (Object.keys(ALLOWED) as DietPreset[]).find((d) => {
      const has = allowedTags(d);
      return has.size === want.size && [...has].every((t) => want.has(t));
    }) ?? null
  );
}

/** Plain-English name for any mix, e.g. "Vegetarian + chicken". */
export function dietLabel(eats: readonly DietTag[]): string {
  const preset = matchingPreset(eats);
  if (preset) return DIET_LABELS[preset];
  const has = allowedTags(eats);
  const extras = [
    has.has('egg') && 'eggs',
    has.has('fish') && 'fish',
    has.has('poultry') && 'chicken',
    has.has('meat') && 'beef, lamb & pork',
  ].filter(Boolean);
  return [has.has('dairy') ? 'Vegetarian' : 'Plant-based', ...extras].join(' + ');
}

/** The "main" food group of a recipe, used to keep a mixed diet balanced across the week. */
export function mainGroup(recipe: Recipe, ingredients: Record<string, Ingredient>): DietTag {
  const tags = recipeTags(recipe, ingredients);
  const order: DietTag[] = ['meat', 'poultry', 'fish', 'egg', 'dairy', 'plant'];
  const main = order.find((t) => tags.has(t)) ?? 'plant';
  // Eggs, dairy and plants all count as "vegetarian" for balance.
  return main === 'egg' || main === 'dairy' ? 'plant' : main;
}

export function fitsCuisines(recipe: Recipe, cuisines: readonly Cuisine[]): boolean {
  return recipe.user === true || cuisines.length === 0 || cuisines.includes(recipe.cuisine);
}

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
  diet: DietPreset | readonly DietTag[],
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

/** All filters the plan generator applies before scoring. Cuisines are optional (pass `{ cuisines: [] }` to ignore). */
export function recipeAllowed(
  recipe: Recipe,
  settings: Pick<Settings, 'eats' | 'appliances' | 'excludes'> & Partial<Pick<Settings, 'cuisines'>>,
  ingredients: Record<string, Ingredient>,
): boolean {
  return (
    fitsDiet(recipe, settings.eats, ingredients) &&
    fitsCuisines(recipe, settings.cuisines ?? []) &&
    fitsAppliances(recipe, settings.appliances) &&
    !hasExcluded(recipe, settings.excludes)
  );
}
