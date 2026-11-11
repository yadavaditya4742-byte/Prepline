import type { Ingredient, Nutrition, Recipe } from '../types';

/**
 * Estimated nutrition per serving. Values are computed from the ingredient
 * table's estimates and are approximate — the UI always labels them so.
 */
export function recipeNutrition(
  recipe: Recipe,
  ingredients: Record<string, Ingredient>,
): Nutrition {
  const total: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const item of recipe.items) {
    const ing = ingredients[item.ingredientId];
    if (!ing) continue;
    const factor = ing.unit === 'each' ? item.qty : item.qty / 100;
    total.kcal += ing.nutrition.kcal * factor;
    total.protein += ing.nutrition.protein * factor;
    total.carbs += ing.nutrition.carbs * factor;
    total.fat += ing.nutrition.fat * factor;
  }
  const s = recipe.servings || 1;
  return {
    kcal: Math.round(total.kcal / s),
    protein: Math.round(total.protein / s),
    carbs: Math.round(total.carbs / s),
    fat: Math.round(total.fat / s),
  };
}
