import type { Cuisine, Ingredient, Recipe } from '../types';
import { recipeNutrition } from '../engine/nutrition';

const KEYWORDS: [RegExp, string][] = [
  [/taco/i, '🌮'],
  [/chili\b/i, '🌶️'],
  [/pasta|alfredo|bolognese/i, '🍝'],
  [/soba|noodle|stir-fry/i, '🥢'],
  [/shakshuka|egg/i, '🍳'],
  [/salmon|fish|tuna/i, '🐟'],
  [/shrimp/i, '🍤'],
  [/chilla/i, '🥞'],
  [/wrap|pita|shawarma/i, '🌯'],
  [/dal|sambar|khichdi|ghugni/i, '🍲'],
  [/curry|keema|masala|makhani|butter chicken|palak|rajma/i, '🍛'],
  [/chicken|tandoori/i, '🍗'],
  [/pork|steak/i, '🥩'],
  [/bowl|salad/i, '🥗'],
];

const CUISINE_EMOJI: Record<Cuisine, string> = {
  Indian: '🍛',
  Mediterranean: '🫒',
  Mexican: '🌮',
  'East Asian': '🥢',
  'Southeast Asian': '🍜',
  'Middle Eastern': '🧆',
  American: '🍽️',
  Italian: '🍝',
  Caribbean: '🍹',
  African: '🍲',
};

export function recipeEmoji(r: Recipe): string {
  for (const [re, e] of KEYWORDS) if (re.test(r.title)) return e;
  return CUISINE_EMOJI[r.cuisine] ?? '🍽️';
}

const TINT: Record<Cuisine, string> = {
  Indian: 'var(--tint-indian)',
  Mediterranean: 'var(--tint-med)',
  Mexican: 'var(--tint-mex)',
  'East Asian': 'var(--tint-asia)',
  'Southeast Asian': 'var(--tint-asia)',
  'Middle Eastern': 'var(--tint-me)',
  American: 'var(--tint-ame)',
  Italian: 'var(--tint-ita)',
  Caribbean: 'var(--tint-mex)',
  African: 'var(--tint-me)',
};
export const recipeTint = (r: Recipe) => TINT[r.cuisine] ?? 'var(--surface-2)';

export function recipeTags(
  r: Recipe,
  ingredients: Record<string, Ingredient>,
  perServing?: number,
): { label: string; hot?: boolean }[] {
  const tags: { label: string; hot?: boolean }[] = [];
  const n = recipeNutrition(r, ingredients);
  if (n.protein >= 40) tags.push({ label: 'High protein', hot: true });
  if (r.minutes <= 25) tags.push({ label: 'Quick' });
  if (perServing !== undefined && perServing <= 2.5) tags.push({ label: 'Budget' });
  if (r.region) tags.push({ label: `${r.region} Indian` });
  else tags.push({ label: r.cuisine });
  return tags.slice(0, 3);
}
