import type { Ingredient, PlanDay, Priority, Recipe, Settings } from '../types';
import { costNeeds, mergeNeeds, recipeUsedCost, type CostSummary, type PriceFn } from './cost';
import { recipeAllowed } from './diet';
import { recipeNutrition } from './nutrition';

/** Small seeded PRNG (mulberry32) so plans are reproducible in tests. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlanInput {
  recipes: Recipe[];
  ingredients: Record<string, Ingredient>;
  settings: Pick<Settings, 'diet' | 'appliances' | 'excludes' | 'servings' | 'weeklyBudget' | 'priority' | 'cookDays'>;
  priceOf: PriceFn;
  pantry: ReadonlySet<string>;
  /** Existing week; locked days are kept. */
  current?: PlanDay[];
  seed?: number;
}

export interface PlanResult {
  days: PlanDay[];
  cost: CostSummary;
  /** False when no combination found fits the budget (e.g. locked meals cost too much). */
  withinBudget: boolean;
  /** Number of recipes that passed the diet/appliance/exclude filters. */
  candidates: number;
}

const WEIGHTS: Record<Priority, { protein: number; cost: number; time: number }> = {
  protein: { protein: 0.7, cost: 0.2, time: 0.1 },
  cost: { protein: 0.2, cost: 0.7, time: 0.1 },
  fast: { protein: 0.15, cost: 0.15, time: 0.7 },
  balanced: { protein: 0.4, cost: 0.4, time: 0.2 },
};

interface Scored {
  recipe: Recipe;
  score: number;
  protein: number;
  usedCost: number;
}

function scoreCandidates(input: PlanInput, pool: Recipe[], priority: Priority): Scored[] {
  const { servings } = input.settings;
  const raw = pool.map((recipe) => ({
    recipe,
    protein: recipeNutrition(recipe, input.ingredients).protein,
    usedCost: recipeUsedCost(recipe, servings, input.priceOf, input.pantry),
  }));
  const span = (xs: number[]) => {
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    return (x: number) => (hi === lo ? 0.5 : (x - lo) / (hi - lo));
  };
  const nP = span(raw.map((r) => r.protein));
  const nC = span(raw.map((r) => r.usedCost));
  const nT = span(raw.map((r) => r.recipe.minutes));
  const w = WEIGHTS[priority];
  return raw.map((r) => ({
    ...r,
    score: w.protein * nP(r.protein) + w.cost * (1 - nC(r.usedCost)) + w.time * (1 - nT(r.recipe.minutes)),
  }));
}

function weekBought(chosen: (Recipe | null)[], input: PlanInput): number {
  const recipes = chosen.filter((r): r is Recipe => r !== null);
  return costNeeds(mergeNeeds(recipes, input.settings.servings), input.priceOf, input.pantry).bought;
}

/** One greedy pass + budget repair. */
function buildWeek(
  input: PlanInput,
  scored: Scored[],
  random: () => number,
  noise: number,
): (Recipe | null)[] {
  const { cookDays, weeklyBudget } = input.settings;
  const allById = new Map(input.recipes.map((r) => [r.id, r]));
  const chosen: (Recipe | null)[] = Array(7).fill(null);
  const locked = new Set<number>();

  input.current?.forEach((d, i) => {
    if (d.locked && d.recipeId) {
      const r = allById.get(d.recipeId);
      if (r) {
        chosen[i] = r;
        locked.add(i);
      }
    }
  });

  const open = cookDays.filter((i) => !locked.has(i)).sort((a, b) => a - b);
  const jitter = new Map(scored.map((s) => [s.recipe.id, s.score + noise * random()]));
  const ranked = [...scored].sort((a, b) => jitter.get(b.recipe.id)! - jitter.get(a.recipe.id)!);
  const used = () => new Set(chosen.filter(Boolean).map((r) => r!.id));
  const cuisineCount = (c: string) => chosen.filter((r) => r?.cuisine === c).length;

  for (const day of open) {
    const taken = used();
    let pool = ranked.filter((s) => !taken.has(s.recipe.id));
    if (pool.length === 0) pool = ranked; // fewer recipes than days: allow repeats
    // Variety: avoid more than 4 nights of one cuisine when there's a choice.
    const varied = pool.filter((s) => cuisineCount(s.recipe.cuisine) < 4);
    if (varied.length) pool = varied;

    // Remaining open days after this one, assume they cost at least the cheapest option.
    const cheapestUsed = Math.min(...pool.map((s) => s.usedCost));
    const remainingAfter = open.filter((d) => d > day).length;

    let pick: Scored | undefined;
    for (const s of pool) {
      chosen[day] = s.recipe;
      const projected = weekBought(chosen, input) + remainingAfter * cheapestUsed;
      if (projected <= weeklyBudget) {
        pick = s;
        break;
      }
    }
    if (!pick) pick = [...pool].sort((a, b) => a.usedCost - b.usedCost)[0];
    chosen[day] = pick.recipe;
  }

  // Repair: swap the day whose replacement saves the most, until under budget.
  // Only the cheapest candidates can rescue an over-budget week, so limit the search (keeps it fast at 150+ recipes).
  const repairPool = [...scored].sort((a, b) => a.usedCost - b.usedCost).slice(0, 40);
  for (let guard = 0; guard < 40 && weekBought(chosen, input) > weeklyBudget; guard++) {
    const current = weekBought(chosen, input);
    let best: { day: number; recipe: Recipe; total: number } | null = null;
    for (const day of open) {
      const original = chosen[day];
      const taken = used();
      for (const s of repairPool) {
        if (taken.has(s.recipe.id) && s.recipe.id !== original?.id) continue;
        chosen[day] = s.recipe;
        const total = weekBought(chosen, input);
        if (total < current && (!best || total < best.total)) best = { day, recipe: s.recipe, total };
      }
      chosen[day] = original;
    }
    if (!best) break;
    chosen[best.day] = best.recipe;
  }
  return chosen;
}

/**
 * Generate a week of dinners under the budget.
 *
 * Strategy: score recipes by the user's priority (with a little randomness for
 * variety), fill open days greedily while projecting the week's package cost,
 * then repair by swapping days until under budget. If the preferred plan still
 * can't fit, fall back to a cost-first plan, so whenever a cheap-enough week
 * exists we return one.
 */
export function generatePlan(input: PlanInput): PlanResult {
  const random = rng(input.seed ?? Date.now());
  const pool = input.recipes.filter((r) => recipeAllowed(r, input.settings, input.ingredients));
  const finish = (chosen: (Recipe | null)[]): PlanResult => {
    const days: PlanDay[] = chosen.map((r, i) => ({
      recipeId: r?.id ?? null,
      locked: Boolean(input.current?.[i]?.locked && input.current[i].recipeId === r?.id && r),
    }));
    const cost = costNeeds(
      mergeNeeds(chosen.filter((r): r is Recipe => r !== null), input.settings.servings),
      input.priceOf,
      input.pantry,
    );
    return { days, cost, withinBudget: cost.bought <= input.settings.weeklyBudget, candidates: pool.length };
  };

  if (pool.length === 0) return finish(buildWeek(input, [], random, 0));

  const preferred = buildWeek(input, scoreCandidates(input, pool, input.settings.priority), random, 0.35);
  if (weekBought(preferred, input) <= input.settings.weeklyBudget) return finish(preferred);

  const cheapest = buildWeek(input, scoreCandidates(input, pool, 'cost'), random, 0);
  if (weekBought(cheapest, input) <= input.settings.weeklyBudget) return finish(cheapest);

  // Last resort: the minimum-cost week (what cheapestWeek() reports).
  const minimum = minimumWeek(input, pool);
  const options = [preferred, cheapest, minimum];
  options.sort((a, b) => weekBought(a, input) - weekBought(b, input));
  return finish(options[0]);
}

function minimumWeek(input: PlanInput, pool: Recipe[]): (Recipe | null)[] {
  const squeezed = { ...input, settings: { ...input.settings, weeklyBudget: 0 } };
  return buildWeek(squeezed, scoreCandidates(squeezed, pool, 'cost'), () => 0, 0);
}

/**
 * The cheapest week the generator can find for these settings (keeping locked
 * days). The UI uses it to tell the user the smallest budget that works.
 */
export function cheapestWeek(input: PlanInput): number {
  const pool = input.recipes.filter((r) => recipeAllowed(r, input.settings, input.ingredients));
  if (pool.length === 0) return 0;
  return weekBought(minimumWeek(input, pool), input);
}

export interface SwapOption {
  recipe: Recipe;
  weekTotal: number;
  delta: number;
  protein: number;
}

/** Every allowed alternative for one day, with the new weekly total if chosen. */
export function swapOptions(input: PlanInput & { current: PlanDay[] }, day: number): SwapOption[] {
  const allById = new Map(input.recipes.map((r) => [r.id, r]));
  const chosen = input.current.map((d) => (d.recipeId ? allById.get(d.recipeId) ?? null : null));
  const base = weekBought(chosen, input);
  const inWeek = new Set(chosen.filter(Boolean).map((r) => r!.id));
  const pool = input.recipes.filter(
    (r) => recipeAllowed(r, input.settings, input.ingredients) && !inWeek.has(r.id),
  );
  return pool
    .map((recipe) => {
      const next = [...chosen];
      next[day] = recipe;
      const weekTotal = weekBought(next, input);
      return {
        recipe,
        weekTotal,
        delta: Math.round((weekTotal - base) * 100) / 100,
        protein: recipeNutrition(recipe, input.ingredients).protein,
      };
    })
    .sort((a, b) => a.weekTotal - b.weekTotal);
}
