import { describe, expect, it } from 'vitest';
import { INGREDIENTS, INGREDIENT_BY_ID, LIBRARY_RECIPES, STORES } from '../data';
import type { Appliance, DietPreset, PlanDay, Priority, StoreId } from '../types';
import { makePriceFn } from './cost';
import { fitsAppliances, fitsDiet, hasExcluded } from './diet';
import { effectivePantry } from './pantry';
import { cheapestWeek, generatePlan, rng, swapOptions, type PlanInput } from './plan';
import { resolvePrice } from './prices';

const DIETS: DietPreset[] = ['vegan', 'vegetarian', 'eggetarian', 'pescatarian', 'chicken-fish', 'everything'];
const PRIORITIES: Priority[] = ['protein', 'cost', 'fast', 'balanced'];
const ALL_APPLIANCES: Appliance[] = ['stovetop', 'oven', 'pressure-cooker', 'air-fryer', 'blender', 'grill', 'microwave'];
const ctx = { overrides: new Map() };
const staples = effectivePantry(INGREDIENTS, new Map());

function input(over: Partial<PlanInput['settings']> & { storeId?: StoreId } = {}, extra: Partial<PlanInput> = {}): PlanInput {
  const storeId = over.storeId ?? 'kroger';
  return {
    recipes: LIBRARY_RECIPES,
    ingredients: INGREDIENT_BY_ID,
    settings: {
      diet: 'everything',
      appliances: ALL_APPLIANCES,
      excludes: [],
      servings: 2,
      weeklyBudget: 1000,
      priority: 'balanced',
      cookDays: [0, 1, 2, 3, 4, 5, 6],
      ...over,
    },
    priceOf: makePriceFn(INGREDIENT_BY_ID, (i) => resolvePrice(storeId, i, ctx)),
    pantry: staples,
    seed: 1,
    ...extra,
  };
}

describe('generatePlan basics', () => {
  it('plans 7 distinct dinners when there are enough recipes', () => {
    const r = generatePlan(input());
    const ids = r.days.map((d) => d.recipeId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(7);
  });

  it('only plans the chosen cooking days', () => {
    const r = generatePlan(input({ cookDays: [0, 2, 4] }));
    expect(r.days.map((d) => Boolean(d.recipeId))).toEqual([true, false, true, false, true, false, false]);
  });

  it('is reproducible for the same seed', () => {
    expect(generatePlan(input()).days).toEqual(generatePlan(input()).days);
  });

  it('keeps locked days and regenerates the rest', () => {
    const first = generatePlan(input());
    const current: PlanDay[] = first.days.map((d, i) => ({ ...d, locked: i === 2 || i === 5 }));
    const next = generatePlan(input({}, { current, seed: 99 }));
    expect(next.days[2]).toEqual({ recipeId: first.days[2].recipeId, locked: true });
    expect(next.days[5]).toEqual({ recipeId: first.days[5].recipeId, locked: true });
    expect(next.days.filter((d) => d.locked)).toHaveLength(2);
  });
});

describe('filters inside generated plans', () => {
  it('respects diet, appliances and exclusions across many runs', () => {
    const rand = rng(7);
    for (let i = 0; i < 150; i++) {
      const diet = DIETS[Math.floor(rand() * DIETS.length)];
      const appliances = ALL_APPLIANCES.filter((a) => a === 'stovetop' || rand() > 0.5);
      const excludes = rand() > 0.5 ? ['paneer', 'mushroom'] : ['tofu'];
      const r = generatePlan(input({ diet, appliances, excludes }, { seed: i }));
      for (const d of r.days) {
        if (!d.recipeId) continue;
        const recipe = LIBRARY_RECIPES.find((x) => x.id === d.recipeId)!;
        expect(fitsDiet(recipe, diet, INGREDIENT_BY_ID), `${diet} ${recipe.id}`).toBe(true);
        expect(fitsAppliances(recipe, appliances), recipe.id).toBe(true);
        expect(hasExcluded(recipe, excludes), recipe.id).toBe(false);
      }
    }
  });

  it('vegetarian never gets eggs, fish or chicken', () => {
    const r = generatePlan(input({ diet: 'vegetarian' }));
    for (const d of r.days) {
      const recipe = LIBRARY_RECIPES.find((x) => x.id === d.recipeId)!;
      for (const it of recipe.items) {
        expect(['plant', 'dairy']).toContain(INGREDIENT_BY_ID[it.ingredientId].diet);
      }
    }
  });
});

describe('budget', () => {
  it('stays under budget across 500 random runs whenever a cheap-enough week exists', () => {
    const rand = rng(2026);
    let checked = 0;
    for (let i = 0; i < 500; i++) {
      const storeId = STORES[Math.floor(rand() * STORES.length)].id;
      const diet = DIETS[Math.floor(rand() * DIETS.length)];
      const priority = PRIORITIES[Math.floor(rand() * PRIORITIES.length)];
      const servings = 1 + Math.floor(rand() * 4);
      const cookDays = [0, 1, 2, 3, 4, 5, 6].filter(() => rand() > 0.15);
      if (cookDays.length === 0) cookDays.push(0);

      // The cheapest week the generator can find…
      const floor = cheapestWeek(input({ storeId, diet, servings, cookDays, priority }));
      // …then ask for a plan with a budget at or above that floor.
      const weeklyBudget = Math.round(floor * (1 + rand() * 0.8) * 100) / 100;
      const r = generatePlan(input({ storeId, diet, servings, cookDays, priority, weeklyBudget }, { seed: i * 31 + 7 }));

      expect(r.withinBudget, `run ${i}: ${storeId} ${diet} x${servings} ${priority} budget ${weeklyBudget} got ${r.cost.bought}`).toBe(true);
      expect(r.cost.bought).toBeLessThanOrEqual(weeklyBudget);
      checked++;
    }
    expect(checked).toBe(500);
  }, 120_000);

  it('reports honestly when the budget is impossible', () => {
    const r = generatePlan(input({ weeklyBudget: 5, servings: 4 }));
    expect(r.withinBudget).toBe(false);
    expect(r.days.filter((d) => d.recipeId)).toHaveLength(7);
  });

  it('a tighter budget never produces a pricier week', () => {
    const loose = generatePlan(input({ weeklyBudget: 200, priority: 'protein' }));
    const tight = generatePlan(input({ weeklyBudget: 60, priority: 'protein' }));
    expect(tight.cost.bought).toBeLessThanOrEqual(loose.cost.bought);
  });
});

describe('swapOptions', () => {
  it('lists alternatives with the new weekly total and delta', () => {
    const base = input();
    const plan = generatePlan(base);
    const opts = swapOptions({ ...base, current: plan.days }, 3);
    expect(opts.length).toBeGreaterThan(0);
    const inWeek = new Set(plan.days.map((d) => d.recipeId));
    for (const o of opts) {
      expect(inWeek.has(o.recipe.id)).toBe(false);
      expect(o.weekTotal).toBeCloseTo(plan.cost.bought + o.delta, 2);
    }
    // Sorted cheapest week first.
    expect(opts[0].weekTotal).toBeLessThanOrEqual(opts[opts.length - 1].weekTotal);
  });
});
