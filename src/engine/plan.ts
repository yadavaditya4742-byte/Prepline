import type { Ingredient, PlanDay, Priority, Recipe, Settings } from '../types';
import { costNeeds, mergeNeeds, recipeUsedCost, type CostSummary, type PriceFn } from './cost';
import { mainGroup, recipeAllowed } from './diet';
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
  settings: Pick<Settings, 'eats' | 'appliances' | 'excludes' | 'servings' | 'weeklyBudget' | 'priority' | 'cookDays'> &
    Partial<Pick<Settings, 'cuisines'>>;
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
  /** True when the chosen cuisines had too few recipes, so others were mixed in. */
  widenedCuisines?: boolean;
  /** Picked cuisines that couldn't fit this week's budget. */
  droppedCuisines?: string[];
}

/**
 * Recipes the planner may use. Honors the chosen cuisines when they offer enough
 * dinners for the week; otherwise widens to every cuisine rather than repeating meals.
 */
export function planPool(input: PlanInput): { pool: Recipe[]; widened: boolean } {
  const all = input.recipes.filter((r) => recipeAllowed(r, { ...input.settings, cuisines: [] }, input.ingredients));
  const cuisines = input.settings.cuisines ?? [];
  if (!cuisines.length) return { pool: all, widened: false };
  const picked = all.filter((r) => recipeAllowed(r, input.settings, input.ingredients));
  const need = Math.max(input.settings.cookDays.length + 2, 7);
  return picked.length >= need ? { pool: picked, widened: false } : { pool: all, widened: true };
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
  /** Spread nights across cuisines and food groups. Off only for the absolute-cheapest fallback. */
  mix = true,
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
  // Mixed diets (e.g. vegetarian + chicken): spread nights across the food groups the user picked.
  const groupOf = new Map(scored.map((s) => [s.recipe.id, mainGroup(s.recipe, input.ingredients)]));
  const groupsAvailable = new Set(groupOf.values()).size;
  const groupCap = groupsAvailable > 1 ? Math.ceil(cookDays.length / groupsAvailable) + 1 : 7;
  const groupCount = (g: string) => chosen.filter((r) => r && (groupOf.get(r.id) ?? mainGroup(r, input.ingredients)) === g).length;
  const cuisinesAvailable = new Set(scored.map((s) => s.recipe.cuisine)).size;
  const cuisineCap = cuisinesAvailable > 1 ? Math.max(Math.ceil(cookDays.length / cuisinesAvailable) + 1, 2) : 7;
  // Cuisines the user picked that have recipes here: each should get at least one night.
  const wanted = (input.settings.cuisines ?? []).filter((c) => scored.some((s) => s.recipe.cuisine === c));
  const missing = () => wanted.filter((c) => cuisineCount(c) === 0);
  /** How far a week is from "nicely mixed": lower is better. */
  const varietyGap = () => {
    let gap = missing().length * 2;
    for (const c of new Set(chosen.map((r) => r?.cuisine))) if (c) gap += Math.max(0, cuisineCount(c) - Math.min(4, cuisineCap));
    for (const g of new Set(groupOf.values())) gap += Math.max(0, groupCount(g) - groupCap);
    return gap;
  };

  for (const day of open) {
    const taken = used();
    let pool = ranked.filter((s) => !taken.has(s.recipe.id));
    if (pool.length === 0) pool = ranked; // fewer recipes than days: allow repeats
    // Variety: spread nights across cuisines and food groups when there's a choice.
    const varied = pool.filter((s) => cuisineCount(s.recipe.cuisine) < Math.min(4, cuisineCap));
    if (mix && varied.length) pool = varied;
    const balanced = pool.filter((s) => groupCount(groupOf.get(s.recipe.id)!) < groupCap);
    if (mix && balanced.length) pool = balanced;
    // Save nights for picked cuisines that haven't appeared yet.
    const need = mix ? missing() : [];
    const left = open.filter((d) => d >= day).length;
    if (need.length && left <= need.length) {
      const fill = pool.filter((s) => need.includes(s.recipe.cuisine));
      if (fill.length) pool = fill;
    }

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
  const byCost = [...scored].sort((a, b) => a.usedCost - b.usedCost);
  // Cheapest overall, plus the cheapest few of every cuisine and food group so variety can survive the repair.
  const repairPool = [
    ...new Set([
      ...byCost.slice(0, 40),
      ...[...new Set(byCost.map((s) => s.recipe.cuisine))].flatMap((c) => byCost.filter((s) => s.recipe.cuisine === c).slice(0, 4)),
      ...[...new Set(groupOf.values())].flatMap((g) => byCost.filter((s) => groupOf.get(s.recipe.id) === g).slice(0, 4)),
    ]),
  ];
  for (let guard = 0; guard < 40 && weekBought(chosen, input) > weeklyBudget; guard++) {
    const current = weekBought(chosen, input);
    const gapNow = mix ? varietyGap() : Infinity;
    // Prefer the biggest saving that keeps the week as mixed as it is; only give up variety if nothing else saves money.
    type Swap = { day: number; recipe: Recipe; total: number };
    let best = null as Swap | null;
    let bestAny = null as Swap | null;
    for (const day of open) {
      const original = chosen[day];
      const taken = used();
      for (const s of repairPool) {
        if (taken.has(s.recipe.id) && s.recipe.id !== original?.id) continue;
        chosen[day] = s.recipe;
        const total = weekBought(chosen, input);
        if (total < current) {
          if (!bestAny || total < bestAny.total) bestAny = { day, recipe: s.recipe, total };
          if (varietyGap() <= gapNow && (!best || total < best.total)) best = { day, recipe: s.recipe, total };
        }
      }
      chosen[day] = original;
    }
    const pick = best ?? bestAny;
    if (!pick) break;
    chosen[pick.day] = pick.recipe;
  }

  return chosen;
}

/**
 * Put back any cuisine the user picked that the budget squeezed out, when one
 * dinner of it still fits the budget. Never touches locked days.
 */
function reinsertCuisines(chosen: (Recipe | null)[], input: PlanInput, scored: Scored[]): (Recipe | null)[] {
  const out = [...chosen];
  const lockedDays = new Set((input.current ?? []).flatMap((d, i) => (d.locked && d.recipeId ? [i] : [])));
  const open = input.settings.cookDays.filter((d) => !lockedDays.has(d));
  const count = (c: string) => out.filter((r) => r?.cuisine === c).length;
  const wanted = (input.settings.cuisines ?? []).filter((c) => scored.some((s) => s.recipe.cuisine === c));
  const byCost = [...scored].sort((a, b) => a.usedCost - b.usedCost);
  for (const c of wanted.filter((x) => count(x) === 0)) {
    const options = byCost.filter((s) => s.recipe.cuisine === c).slice(0, 8);
    let best = null as { day: number; recipe: Recipe; total: number } | null;
    const taken = new Set(out.filter(Boolean).map((r) => r!.id));
    for (const day of open) {
      const original = out[day];
      // Don't take the only night of another picked cuisine.
      if (original && wanted.includes(original.cuisine) && count(original.cuisine) <= 1) continue;
      for (const s of options) {
        if (taken.has(s.recipe.id)) continue;
        out[day] = s.recipe;
        const total = weekBought(out, input);
        if (total <= input.settings.weeklyBudget && (!best || total < best.total)) best = { day, recipe: s.recipe, total };
      }
      out[day] = original;
    }
    if (best) out[best.day] = best.recipe;
  }
  return out;
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
  const { pool, widened } = planPool(input);
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
    const wanted = (input.settings.cuisines ?? []).filter((c) => pool.some((r) => r.cuisine === c));
    const dropped = wanted.filter((c) => !chosen.some((r) => r?.cuisine === c));
    return {
      days,
      cost,
      withinBudget: cost.bought <= input.settings.weeklyBudget,
      candidates: pool.length,
      ...(widened && { widenedCuisines: true }),
      ...(dropped.length && { droppedCuisines: dropped }),
    };
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
  // The cheapest week may have dropped a cuisine you picked; add one back if it still fits.
  return finish(reinsertCuisines(options[0], input, scoreCandidates(input, pool, 'cost')));
}

function minimumWeek(input: PlanInput, pool: Recipe[]): (Recipe | null)[] {
  const squeezed = { ...input, settings: { ...input.settings, weeklyBudget: 0 } };
  return buildWeek(squeezed, scoreCandidates(squeezed, pool, 'cost'), () => 0, 0, false);
}

/**
 * The cheapest week the generator can find for these settings (keeping locked
 * days). The UI uses it to tell the user the smallest budget that works.
 */
export function cheapestWeek(input: PlanInput): number {
  const { pool } = planPool(input);
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
  // Swaps show every cuisine you eat; the planner is what sticks to your favorites.
  const pool = input.recipes.filter(
    (r) => recipeAllowed(r, { ...input.settings, cuisines: [] }, input.ingredients) && !inWeek.has(r.id),
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
