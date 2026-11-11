import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, INGREDIENTS, LIBRARY_RECIPES } from '../data';
import * as db from '../db/db';
import { makePriceFn, type PriceFn } from '../engine/cost';
import { effectivePantry } from '../engine/pantry';
import { generatePlan, type PlanInput } from '../engine/plan';
import { isLivePriceFile, overrideKey, resolvePrice, type PriceContext } from '../engine/prices';
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
  setPrice: (storeId: StoreId, ingredientId: string, p: { size: number; price: number; label: string }) => Promise<void>;
  resetPrice: (storeId: StoreId, ingredientId: string) => Promise<void>;
  resetStorePrices: (storeId: StoreId) => Promise<number>;
  addIngredient: (ing: Ingredient) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
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
  const [live, setLive] = useState<LivePriceFile | null>(null);
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

  // Live Kroger prices: use the cached copy straight away, then try the latest file.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await db.loadLiveCache().catch(() => null);
      if (cached && !cancelled) setLive(cached);
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}prices/live.json`, { cache: 'no-cache' });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!isLivePriceFile(data) || cancelled) return;
        if (!cached || data.fetchedAt >= cached.fetchedAt) {
          setLive(data);
          await db.saveLiveCache(data);
        }
      } catch {
        /* offline or not deployed with live prices: keep the cache */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const priceCtx = useMemo<PriceContext>(() => ({ overrides, live }), [overrides, live]);
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
    setPrice,
    resetPrice,
    resetStorePrices,
    addIngredient,
    deleteIngredient,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
