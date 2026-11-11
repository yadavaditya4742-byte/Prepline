import { describe, expect, it } from 'vitest';
import { AISLE_ORDER, INGREDIENT_BY_ID } from '../data';
import { costNeeds } from './cost';
import { groupByAisle, listAsText } from './shopping';

const p = (size: number, price: number, label: string) => ({ size, price, label, source: 'seed' as const });

describe('shopping list', () => {
  const needs = new Map([
    ['tofu', 600],
    ['onion', 300],
    ['salt', 10],
    ['spinach', 100],
  ]);
  const prices: Record<string, ReturnType<typeof p>> = {
    tofu: p(397, 2.49, '14 oz block'),
    onion: p(1360, 3.49, '3 lb bag'),
    salt: p(737, 1.29, '26 oz'),
    spinach: p(283, 2.99, '10 oz'),
  };
  const cost = costNeeds(needs, (id) => prices[id], new Set(['salt']));
  const { groups, pantry } = groupByAisle(cost, INGREDIENT_BY_ID, AISLE_ORDER);

  it('groups by aisle in store order and pulls pantry items out', () => {
    expect(groups.map((g) => g.aisle)).toEqual(['Produce', 'Tofu & Plant Protein']);
    expect(groups[0].lines.map((l) => l.ingredientId)).toEqual(['spinach', 'onion']); // alphabetical by name
    expect(pantry.map((l) => l.ingredientId)).toEqual(['salt']);
  });

  it('shows packages to buy in the text export', () => {
    const text = listAsText({ storeName: 'Kroger family', weekLabel: 'week of Nov 9', groups, ingredients: INGREDIENT_BY_ID, total: cost.bought });
    expect(text).toContain('PRODUCE');
    expect(text).toContain('☐ Tofu, extra-firm (2 × 14 oz block, $4.98)');
    expect(text).not.toContain('Salt');
    expect(text).toContain(`Estimated total $${cost.bought.toFixed(2)}`);
  });
});
