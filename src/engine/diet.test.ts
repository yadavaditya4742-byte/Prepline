import { describe, expect, it } from 'vitest';
import { INGREDIENT_BY_ID, LIBRARY_RECIPES } from '../data';
import type { Recipe } from '../types';
import { dietLabel, fitsAppliances, fitsDiet, presetTags, recipeAllowed, recipeDiet } from './diet';

const byId = (id: string) => LIBRARY_RECIPES.find((r) => r.id === id)!;
const ING = INGREDIENT_BY_ID;

describe('diet filters', () => {
  it('derives the strictest diet a recipe fits', () => {
    expect(recipeDiet(byId('chana-quinoa-masala'), ING)).toBe('vegetarian');
    expect(recipeDiet(byId('masala-egg-scramble-wraps'), ING)).toBe('eggetarian');
    expect(recipeDiet(byId('kerala-shrimp-curry'), ING)).toBe('pescatarian');
    expect(recipeDiet(byId('tandoori-chicken-tray'), ING)).toBe('chicken-fish');
  });

  it('vegetarian excludes eggs, fish and chicken', () => {
    expect(fitsDiet(byId('soya-keema-matar'), 'vegetarian', ING)).toBe(true);
    expect(fitsDiet(byId('masala-egg-scramble-wraps'), 'vegetarian', ING)).toBe(false);
    expect(fitsDiet(byId('kerala-shrimp-curry'), 'vegetarian', ING)).toBe(false);
    expect(fitsDiet(byId('tandoori-chicken-tray'), 'vegetarian', ING)).toBe(false);
  });

  it('chicken-fish allows poultry and fish but not red meat', () => {
    const beef: Recipe = { ...byId('turkey-black-bean-tacos'), id: 'beef', items: [{ ingredientId: 'ground-beef', qty: 500 }] };
    expect(fitsDiet(byId('tandoori-chicken-tray'), 'chicken-fish', ING)).toBe(true);
    expect(fitsDiet(beef, 'chicken-fish', ING)).toBe(false);
    expect(fitsDiet(beef, 'everything', ING)).toBe(true);
  });

  it('every library recipe respects whatever diet allows it', () => {
    for (const r of LIBRARY_RECIPES) {
      const d = recipeDiet(r, ING);
      expect(fitsDiet(r, d, ING), r.id).toBe(true);
    }
  });
});

describe('appliance and exclusion filters', () => {
  it('requires every appliance the recipe needs', () => {
    const tray = byId('tandoori-chicken-tray');
    expect(fitsAppliances(tray, ['stovetop'])).toBe(false);
    expect(fitsAppliances(tray, ['stovetop', 'oven'])).toBe(true);
  });

  it('excluded ingredients remove a recipe', () => {
    const base = { eats: presetTags('everything'), appliances: ['stovetop', 'oven'] as const };
    const r = byId('tandoori-chicken-tray');
    expect(recipeAllowed(r, { ...base, appliances: [...base.appliances], excludes: [] }, ING)).toBe(true);
    expect(recipeAllowed(r, { ...base, appliances: [...base.appliances], excludes: ['bell-pepper'] }, ING)).toBe(false);
  });
});

describe('diet labels for any mix', () => {
  it.each([
    [[], 'Vegan'],
    [['dairy'], 'Vegetarian (no eggs)'],
    [['dairy', 'egg'], 'Vegetarian + eggs'],
    [['dairy', 'poultry'], 'Vegetarian + chicken'],
    [['dairy', 'egg', 'poultry'], 'Vegetarian + eggs + chicken'],
    [['egg', 'fish'], 'Plant-based + eggs + fish'],
    [['dairy', 'egg', 'fish', 'poultry'], 'Chicken & fish'],
  ] as const)('%j → %s', (eats, label) => {
    expect(dietLabel(eats)).toBe(label);
  });
});
