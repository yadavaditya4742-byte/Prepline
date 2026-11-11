import { describe, expect, it } from 'vitest';
import { INGREDIENTS, INGREDIENT_BY_ID, LIBRARY_RECIPES } from '../data';
import { parseRecipeText } from '../import/parseRecipe';
import { draftFromParsed, draftFromRecipe, recipeFromDraft } from './RecipeEditor';

describe('recipe editor drafts', () => {
  it('round-trips a library recipe through the editor without changing quantities much', () => {
    const r = LIBRARY_RECIPES.find((x) => x.id === 'masoor-dal-raita-rice')!;
    const back = recipeFromDraft(draftFromRecipe(r, INGREDIENT_BY_ID), INGREDIENT_BY_ID, 'copy');
    expect(back.items).toHaveLength(r.items.length);
    for (const it of r.items) {
      const b = back.items.find((x) => x.ingredientId === it.ingredientId)!;
      expect(b.qty / it.qty).toBeGreaterThan(0.95);
      expect(b.qty / it.qty).toBeLessThan(1.05);
    }
    expect(back.steps).toEqual(r.steps);
    expect(back.user).toBe(true);
  });

  it('turns a pasted recipe into a saveable recipe', () => {
    const p = parseRecipeText('Dal\nServes 2\nIngredients\n1 cup red lentils\n2 cloves garlic\nMystery spice blend\nMethod\nSimmer everything.', INGREDIENTS);
    const d = draftFromParsed(p, INGREDIENT_BY_ID);
    expect(d.servings).toBe(2);
    expect(d.rows.filter((r) => !r.ingredientId)).toHaveLength(1); // the mystery line waits for the user
    const r = recipeFromDraft(d, INGREDIENT_BY_ID, 'x');
    expect(r.items.map((i) => i.ingredientId)).toEqual(['masoor-dal', 'garlic']);
    expect(r.items[0].qty).toBeCloseTo(192, 0);
    expect(r.steps).toEqual(['Simmer everything.']);
  });
});
