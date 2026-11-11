import { describe, expect, it } from 'vitest';
import { recipeNutrition } from '../engine/nutrition';
import { INGREDIENTS, INGREDIENT_BY_ID, LIBRARY_RECIPES } from '.';

describe('ingredient table', () => {
  it('has unique ids', () => {
    expect(new Set(INGREDIENTS.map((i) => i.id)).size).toBe(INGREDIENTS.length);
  });
  it('has sane nutrition (macros roughly match calories)', () => {
    for (const i of INGREDIENTS) {
      const { kcal, protein, carbs, fat } = i.nutrition;
      const est = protein * 4 + carbs * 4 + fat * 9;
      // Tiny-calorie items have rounding noise; spices are mostly fiber, which counts as carbs but adds few calories.
      if (kcal < 30 || i.aisle === 'Spices') continue;
      expect(Math.abs(est - kcal) / kcal, i.id).toBeLessThan(0.35);
    }
  });
});

describe('recipe library', () => {
  it('has unique ids', () => {
    expect(new Set(LIBRARY_RECIPES.map((r) => r.id)).size).toBe(LIBRARY_RECIPES.length);
  });
  it('only uses known ingredients', () => {
    for (const r of LIBRARY_RECIPES) {
      for (const it of r.items) expect(INGREDIENT_BY_ID[it.ingredientId], `${r.id} → ${it.ingredientId}`).toBeDefined();
    }
  });
  it('every dinner has at least 25 g protein per serving (estimated)', () => {
    for (const r of LIBRARY_RECIPES) {
      expect(recipeNutrition(r, INGREDIENT_BY_ID).protein, r.id).toBeGreaterThanOrEqual(25);
    }
  });
  it('every recipe has steps, time and appliances', () => {
    for (const r of LIBRARY_RECIPES) {
      expect(r.steps.length, r.id).toBeGreaterThanOrEqual(3);
      expect(r.minutes, r.id).toBeGreaterThan(0);
      expect(r.appliances.length, r.id).toBeGreaterThan(0);
    }
  });
});
