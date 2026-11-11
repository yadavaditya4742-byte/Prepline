import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data';
import { fromImported } from './aiImport';
import { matchIngredient, parseIngredientLine, parseRecipeText } from './parseRecipe';

const line = (s: string) => parseIngredientLine(s, INGREDIENTS);

describe('parseIngredientLine', () => {
  it('reads simple metric amounts', () => {
    const l = line('500g chicken thighs, cut into chunks');
    expect(l.ingredientId).toBe('chicken-thigh');
    expect(l.qty).toBe(500);
    expect(l.note).toBe('cut into chunks');
  });

  it('reads fractions, mixed numbers and unicode fractions', () => {
    expect(line('1 1/2 cups basmati rice').qty).toBeCloseTo(277.5, 0);
    expect(line('½ tsp turmeric').qty).toBeCloseTo(1.25, 0);
    expect(line('1½ tbsp ghee').qty).toBeCloseTo(19.2, 0);
  });

  it('converts imperial units', () => {
    expect(line('1 lb ground turkey').qty).toBeCloseTo(453.6, 0);
    expect(line('8 oz mushrooms, sliced').qty).toBeCloseTo(226.8, 0);
  });

  it('handles cans with a size in parentheses', () => {
    const l = line('2 (15-oz) cans chickpeas, drained');
    expect(l.ingredientId).toBe('chickpeas-can');
    expect(l.qty).toBe(878);
  });

  it('handles cloves, inches, and counts', () => {
    expect(line('4 cloves garlic, minced')).toMatchObject({ ingredientId: 'garlic', qty: 20 });
    expect(line('1 inch ginger, grated')).toMatchObject({ ingredientId: 'ginger', qty: 10 });
    expect(line('2 large onions, finely chopped')).toMatchObject({ ingredientId: 'onion', qty: 300 });
    expect(line('3 eggs')).toMatchObject({ ingredientId: 'egg', qty: 3 });
  });

  it('uses Indian and British names', () => {
    expect(line('1 cup toor dal').ingredientId).toBe('toor-dal');
    expect(line('200 g paneer, cubed').ingredientId).toBe('paneer');
    expect(line('1 tsp kashmiri chilli powder').ingredientId).toBe('chili-powder');
    expect(line('2 courgettes').ingredientId).toBe('zucchini');
    expect(line('handful of coriander leaves').ingredientId).toBe('cilantro');
  });

  it('prefers the longest match', () => {
    expect(matchIngredient('sweet potatoes', INGREDIENTS).id).toBe('sweet-potato');
    expect(matchIngredient('red onion', INGREDIENTS).id).toBe('red-onion');
    expect(matchIngredient('ground cumin', INGREDIENTS).id).toBe('cumin');
    expect(matchIngredient('cumin seeds', INGREDIENTS).id).toBe('cumin-seeds');
  });

  it('flags lines it cannot match instead of guessing wildly', () => {
    const l = line('2 tbsp unobtainium syrup');
    expect(l.ingredientId).toBeNull();
  });

  it('gives "salt to taste" a sensible pinch', () => {
    expect(line('Salt to taste')).toMatchObject({ ingredientId: 'salt', qty: 3, guessed: true });
  });
});

describe('parseRecipeText', () => {
  const text = `Weeknight Chana Masala
Serves 4
Total time: 35 minutes

Ingredients
- 2 (15 oz) cans chickpeas, drained
- 1 large onion, chopped
- 3 cloves garlic
- 1 tbsp oil
- 1 tsp garam masala
- Salt to taste

Instructions
1. Heat the oil and cook the onion until golden.
2. Add garlic and spices, then the chickpeas.
3. Simmer 15 minutes and serve.`;

  it('splits title, servings, time, ingredients and steps', () => {
    const r = parseRecipeText(text, INGREDIENTS);
    expect(r.title).toBe('Weeknight Chana Masala');
    expect(r.servings).toBe(4);
    expect(r.minutes).toBe(35);
    expect(r.lines.map((l) => l.ingredientId)).toEqual(['chickpeas-can', 'onion', 'garlic', 'oil', 'garam-masala', 'salt']);
    expect(r.steps).toHaveLength(3);
    expect(r.steps[0]).toBe('Heat the oil and cook the onion until golden.');
  });

  it('works without section headings', () => {
    const r = parseRecipeText(`Quick Tofu Scramble
400 g tofu
1 cup spinach
Crumble the tofu into a hot pan and cook until dry, then wilt in the spinach and season well before serving.`, INGREDIENTS);
    expect(r.lines.map((l) => l.ingredientId)).toEqual(['tofu', 'spinach']);
    expect(r.steps).toHaveLength(1);
  });

  it('accepts AI importer output through the same parser (extension point)', () => {
    const r = fromImported({ title: 'Dal', servings: 2, ingredients: ['1 cup red lentils', '2 cups water'], steps: ['Simmer.'] }, INGREDIENTS);
    expect(r.title).toBe('Dal');
    expect(r.servings).toBe(2);
    expect(r.lines[0].ingredientId).toBe('masoor-dal');
  });
});
