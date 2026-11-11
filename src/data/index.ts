import type { Recipe, Settings } from '../types';
import { MORE_RECIPES } from './recipes/more';
import { STARTER_RECIPES } from './recipes/starter';

export { INGREDIENTS, INGREDIENT_BY_ID, AISLE_ORDER } from './ingredients';
export { STORES, STORE_BY_ID } from './stores';

export const LIBRARY_RECIPES: Recipe[] = [...STARTER_RECIPES, ...MORE_RECIPES];

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  weeklyBudget: 75,
  storeId: 'kroger',
  diet: 'chicken-fish',
  servings: 2,
  appliances: ['stovetop', 'oven', 'microwave'],
  excludes: [],
  priority: 'balanced',
  cookDays: [0, 1, 2, 3, 4, 5, 6],
  theme: 'system',
};
