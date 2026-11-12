import { flushFeedback } from './feedback';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, INGREDIENTS, LIBRARY_RECIPES } from '../data';
import * as db from '../db/db';
import { makePriceFn, type PriceFn } from '../engine/cost';
import { effectivePantry } from '../engine/pantry';
import { generatePlan, type PlanInput } from '../engine/plan';
import { overrideKey, resolvePrice, type PriceContext } from '../engine/prices';
import { useLivePrices, type LiveState } from './livePrices';
import { regionForZip } from '../engine/region';
import { isoDate, mondayOf } from '../engine/week';
import type { Ingredient, LivePriceFile, PlanDay, PriceOverride, Recipe, Settings, StoreId, WeekPlan } from '../types';

interface AppState {
  ready: boolean;
  settings: Settings;
  ingredients: Record<string, Ingredient>;
  recipes: Recipe[];
  recipeById: Map<string, Recipe>;
  overrides: Map<string, PriceOverride>;
  priceCtx: PriceContext;
  priceOf: PriceFn;
  pantryExplicit: Map<string, boolean>;
  pantry: Set<string>;
  weekStart: string;
  plan: WeekPlan | null;
  planInput: (current?: PlanDay[]) => PlanInput;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  setPlanDays: (days: PlanDay[]) => Promise<void>;
  regenerate: () => Promise<void>;
  completeOnboarding: (s: Settings) => Promise<void>;
  togglePantry: (id: string, have: boolean) => Promise<void>;
  reload: () => Promise<void>;

  live: LivePriceFile | null;
  liveState: LiveState;
  setPrice: (storeId: StoreId, ingredientId: string, p: { size: number; price: number; label: string }) => Promise<void>;
  resetPrice: (storeId: StoreId, ingredientId: string) => Promise<void>;
  resetStorePrices: (storeId: StoreId) => Promise<number>;
  addIngredient: (ing: Ingredient) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  saveRecipe: (r: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [overrides, setOverrides] = useState<Map<string, PriceOverride>>(new Map());
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([]);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [pantryExplicit, setPantryExplicit] = useState<Map<string, boolean>>(new Map());
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const weekStart = useMemo(() => isoDate(mondayOf(new Date())), []);

  const reload = useCallback(async () => {
    const [s, o, ci, ur, p, wp] = await Promise.all([
      db.loadSettings(),
      db.loadOverrides(),
      db.loadCustomIngredients(),
      db.loadUserRecipes(),
      db.loadPantry(),
      db.loadPlan(weekStart),
    ]);
    setSettings(s);
    setOverrides(new Map(o.map((x) => [x.key, x])));
    setCustomIngredients(ci);
    setUserRecipes(ur);
    setPantryExplicit(p);
    setPlan(wp ?? null);
    setReady(true);
  }, [weekStart]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Send feedback written while offline, on start and whenever the phone reconnects.
  useEffect(() => {
    if (!ready) return;
    const flush = () => void flushFeedback(settings.pricesApi).catch(() => undefined);
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [ready, settings.pricesApi]);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const ingredients = useMemo(() => {
    const all = [...INGREDIENTS, ...customIngredients];
    return Object.fromEntries(all.map((i) => [i.id, i]));
  }, [customIngredients]);

  const recipes = useMemo(() => [...LIBRARY_RECIPES, ...userRecipes], [userRecipes]);
  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const allIds = useMemo(() => Object.keys(ingredients).filter((id) => !ingredients[id].custom).sort(), [ingredients]);
  const liveState = useLivePrices({ zip: settings.zip, pricesApi: settings.pricesApi, ingredientIds: allIds });
  const live = liveState.liveByStore.kroger ?? null;
  const priceCtx = useMemo<PriceContext>(
    () => ({
      overrides,
      live,
      liveByStore: liveState.liveByStore,
      community: liveState.community,
      regional: liveState.regional,
      region: regionForZip(settings.zip),
    }),
    [overrides, live, liveState, settings.zip],
  );
  const priceOf = useMemo(
    () => makePriceFn(ingredients, (ing) => resolvePrice(settings.storeId, ing, priceCtx)),
    [ingredients, settings.storeId, priceCtx],
  );
  const pantry = useMemo(() => effectivePantry(Object.values(ingredients), pantryExplicit), [ingredients, pantryExplicit]);

  const inputFor = useCallback(
    (s: Settings, current?: PlanDay[]): PlanInput => ({
      recipes,
      ingredients,
      settings: s,
      priceOf:
        s.storeId === settings.storeId
          ? priceOf
          : makePriceFn(ingredients, (ing) => resolvePrice(s.storeId, ing, priceCtx)),
      pantry,
      current,
      seed: Math.floor(Math.random() * 2 ** 31),
    }),
    [recipes, ingredients, settings.storeId, priceOf, priceCtx, pantry],
  );
  const planInput = useCallback((current?: PlanDay[]) => inputFor(settings, current), [inputFor, settings]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await db.saveSettings(next);
    },
    [settings],
  );

  const setPlanDays = useCallback(
    async (days: PlanDay[]) => {
      const wp: WeekPlan = { weekStart, days, createdAt: new Date().toISOString() };
      setPlan(wp);
      await db.savePlan(wp);
    },
    [weekStart],
  );

  const regenerate = useCallback(async () => {
    const res = generatePlan(planInput(plan?.days));
    await setPlanDays(res.days);
  }, [planInput, plan, setPlanDays]);

  /** Save onboarding answers and build the first plan from them. */
  const completeOnboarding = useCallback(
    async (s: Settings) => {
      const next = { ...s, onboarded: true };
      setSettings(next);
      await db.saveSettings(next);
      const res = generatePlan(inputFor(next));
      await setPlanDays(res.days);
    },
    [inputFor, setPlanDays],
  );

  const togglePantry = useCallback(async (id: string, have: boolean) => {
    setPantryExplicit((m) => new Map(m).set(id, have));
    await db.setPantry(id, have);
  }, []);

  const setPrice = useCallback(async (storeId: StoreId, ingredientId: string, p: { size: number; price: number; label: string }) => {
    const o: PriceOverride = { key: overrideKey(storeId, ingredientId), storeId, ingredientId, ...p, updatedAt: new Date().toISOString() };
    setOverrides((m) => new Map(m).set(o.key, o));
    await db.saveOverride(o);
  }, []);

  const resetPrice = useCallback(async (storeId: StoreId, ingredientId: string) => {
    const key = overrideKey(storeId, ingredientId);
    setOverrides((m) => {
      const n = new Map(m);
      n.delete(key);
      return n;
    });
    await db.deleteOverride(key);
  }, []);

  const resetStorePrices = useCallback(
    async (storeId: StoreId) => {
      const keys = [...overrides.values()].filter((o) => o.storeId === storeId).map((o) => o.key);
      setOverrides((m) => {
        const n = new Map(m);
        keys.forEach((k) => n.delete(k));
        return n;
      });
      await Promise.all(keys.map((k) => db.deleteOverride(k)));
      return keys.length;
    },
    [overrides],
  );

  const addIngredient = useCallback(async (ing: Ingredient) => {
    const withFlag = { ...ing, custom: true };
    setCustomIngredients((list) => [...list.filter((x) => x.id !== ing.id), withFlag]);
    await db.saveCustomIngredient(withFlag);
  }, []);

  const deleteIngredient = useCallback(async (id: string) => {
    setCustomIngredients((list) => list.filter((x) => x.id !== id));
    await db.deleteCustomIngredient(id);
  }, []);

  const saveRecipe = useCallback(async (r: Recipe) => {
    const withFlag = { ...r, user: true };
    setUserRecipes((list) => [...list.filter((x) => x.id !== r.id), withFlag]);
    await db.saveUserRecipe(withFlag);
  }, []);

  const deleteRecipe = useCallback(
    async (id: string) => {
      setUserRecipes((list) => list.filter((x) => x.id !== id));
      await db.deleteUserRecipe(id);
      // Clear it from this week's plan so the plan never points at a missing recipe.
      if (plan?.days.some((d) => d.recipeId === id)) {
        const days = plan.days.map((d) => (d.recipeId === id ? { recipeId: null, locked: false } : d));
        const wp = { ...plan, days };
        setPlan(wp);
        await db.savePlan(wp);
      }
    },
    [plan],
  );

  const value: AppState = {
    ready,
    settings,
    ingredients,
    recipes,
    recipeById,
    overrides,
    priceCtx,
    priceOf,
    pantryExplicit,
    pantry,
    weekStart,
    plan,
    planInput,
    updateSettings,
    setPlanDays,
    regenerate,
    completeOnboarding,
    togglePantry,
    reload,
    live,
    liveState,
    setPrice,
    resetPrice,
    resetStorePrices,
    addIngredient,
    deleteIngredient,
    saveRecipe,
    deleteRecipe,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
