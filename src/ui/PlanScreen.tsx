import { useMemo, useState } from 'react';
import { STORE_BY_ID } from '../data';
import { recipeUsedCost, weekCost } from '../engine/cost';
import { recipeNutrition } from '../engine/nutrition';
import { generatePlan, swapOptions } from '../engine/plan';
import { addDays, DAY_NAMES, isoDate, monthDay } from '../engine/week';
import { useApp } from '../state/store';
import type { PlanDay, Recipe } from '../types';
import { money } from './format';
import { IconList, IconLock, IconRefresh, IconSwap, IconUnlock } from './icons';
import { Segmented, Sheet, useToast } from './kit';
import { RecipeSheet } from './RecipeSheet';
import { recipeEmoji, recipeTags, recipeTint } from './visuals';

export function PlanScreen({ onOpenList }: { onOpenList: () => void }) {
  const app = useApp();
  const { settings, plan, recipeById } = app;
  const [swapDay, setSwapDay] = useState<number | null>(null);
  const [open, setOpen] = useState<Recipe | null>(null);
  const [toast, showToast] = useToast();

  const days: PlanDay[] = plan?.days ?? Array.from({ length: 7 }, () => ({ recipeId: null, locked: false }));
  const recipes = days.map((d) => (d.recipeId ? recipeById.get(d.recipeId) ?? null : null));
  const planned = recipes.filter((r): r is Recipe => r !== null);

  const cost = useMemo(
    () => weekCost(planned, settings.servings, app.priceOf, app.pantry),
    [planned, settings.servings, app.priceOf, app.pantry],
  );
  const nutrition = planned.map((r) => recipeNutrition(r, app.ingredients));
  const avg = (k: 'protein' | 'kcal') => (nutrition.length ? Math.round(nutrition.reduce((s, n) => s + n[k], 0) / nutrition.length) : 0);
  const plates = planned.length * settings.servings;
  const over = cost.bought > settings.weeklyBudget;
  const listCount = cost.lines.filter((l) => !l.inPantry).length;
  const todayIso = isoDate(new Date());

  const regenerate = async () => {
    const res = generatePlan(app.planInput(days));
    await app.setPlanDays(res.days);
    showToast(res.withinBudget ? `New week · ${money(res.cost.bought)}` : `Closest we could get: ${money(res.cost.bought)}`);
  };

  const toggleLock = (i: number) => app.setPlanDays(days.map((d, j) => (j === i ? { ...d, locked: !d.locked } : d)));
  const lockedCount = days.filter((d) => d.locked && d.recipeId).length;

  return (
    <>
      <div className="topline">
        <span className="wordmark">
          Prepline<span className="dot" />
        </span>
        <span className="tag" style={{ padding: '6px 12px', fontSize: 12 }}>{STORE_BY_ID[settings.storeId].name}</span>
      </div>

      {/* Budget hero */}
      <section className="hero">
        <div className="small muted" style={{ fontWeight: 700 }}>
          This week · {monthDay(addDays(app.weekStart, 0))} – {monthDay(addDays(app.weekStart, 6))}
        </div>
        <div className="row" style={{ alignItems: 'baseline', gap: 8, margin: '6px 0 12px' }}>
          <span className="num" style={{ fontSize: 42, lineHeight: 1 }}>{money(cost.bought)}</span>
          <span className="muted" style={{ fontWeight: 700 }}>of {money(settings.weeklyBudget)}</span>
        </div>
        <div className={`meter${over ? ' over' : ''}`}>
          <span style={{ width: `${Math.min(100, (cost.bought / settings.weeklyBudget) * 100)}%` }} />
        </div>
        <div className="small" style={{ marginTop: 8, fontWeight: 700, color: over ? '#ffb199' : 'var(--hero-muted)' }}>
          {over
            ? `${money(cost.bought - settings.weeklyBudget)} over budget, try swapping a dinner`
            : `${money(settings.weeklyBudget - cost.bought)} left · ${planned.length} dinners for ${settings.servings}`}
        </div>
        <div className="stats">
          <div className="stat"><b>{avg('protein')}g</b><span>protein avg*</span></div>
          <div className="stat"><b>{avg('kcal')}</b><span>kcal avg*</span></div>
          <div className="stat"><b>{plates ? money(cost.bought / plates) : '–'}</b><span>per plate</span></div>
        </div>
      </section>

      <div className="row" style={{ margin: '16px 0 4px' }}>
        <button className="btn" onClick={regenerate}>
          <IconRefresh /> {lockedCount ? 'Regenerate unlocked' : 'Regenerate week'}
        </button>
        <span className="spacer" />
        {lockedCount > 0 && <span className="muted small" style={{ fontWeight: 700 }}>{lockedCount} locked</span>}
      </div>

      {/* Days */}
      <div className="stack" style={{ marginTop: 12 }}>
        {days.map((d, i) => {
          const r = recipes[i];
          const date = addDays(app.weekStart, i);
          const badge = (
            <div className={`day-badge${isoDate(date) === todayIso ? ' today' : ''}`}>
              {DAY_NAMES[i].slice(0, 3)}
              <b>{date.getDate()}</b>
            </div>
          );
          if (!r) {
            return (
              <div className="day-row" key={i}>
                {badge}
                <div className="empty-day">
                  No dinner planned
                  <span className="spacer" />
                  <button className="btn" style={{ minHeight: 38 }} onClick={() => setSwapDay(i)}>Add</button>
                </div>
              </div>
            );
          }
          const pp = recipeUsedCost(r, settings.servings, app.priceOf, app.pantry) / settings.servings;
          return (
            <div className="day-row" key={i}>
              {badge}
              <div className={`meal${d.locked ? ' locked' : ''}`}>
                <button type="button" className="meal-open" onClick={() => setOpen(r)} aria-label={`Open ${r.title}`}>
                  <span className="thumb" style={{ background: recipeTint(r) }} aria-hidden>{recipeEmoji(r)}</span>
                  <span className="meal-body">
                    <span className="meal-tags">
                      {recipeTags(r, app.ingredients, pp).slice(0, 2).map((t) => (
                        <span key={t.label} className={`tag${t.hot ? ' hot' : ''}`}>{t.label}</span>
                      ))}
                    </span>
                    <span className="meal-title">{r.title}</span>
                    <span className="muted small" style={{ fontWeight: 600 }}>
                      {r.minutes} min · {recipeNutrition(r, app.ingredients).protein} g protein
                    </span>
                  </span>
                </button>
                <div className="meal-foot">
                  <span className="muted small" style={{ fontWeight: 600 }}>Serves {settings.servings}</span>
                  <span className="spacer" />
                  <span className="num" style={{ fontSize: 16 }}>{money(pp)}<span className="muted small" style={{ fontWeight: 600 }}>/plate</span></span>
                  <button className={`icon-btn sm${d.locked ? ' on' : ''}`} aria-label={d.locked ? 'Unlock' : 'Lock'} aria-pressed={d.locked} onClick={() => toggleLock(i)}>
                    {d.locked ? <IconLock /> : <IconUnlock />}
                  </button>
                  <button className="icon-btn sm" aria-label="Swap" onClick={() => setSwapDay(i)}>
                    <IconSwap />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly summary */}
      {planned.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Week at a glance</h2>
            <span className="muted small">*estimates</span>
          </div>
          <div className="card">
            <div className="kv"><span>Avg protein per dinner</span><b className="num">{avg('protein')} g</b></div>
            <div className="kv"><span>Avg calories per dinner</span><b className="num">{avg('kcal')} kcal</b></div>
            <div className="kv"><span>Total spend (packages bought)</span><b className="num">{money(cost.bought)}</b></div>
            <div className="kv"><span>Food actually used</span><b className="num">{money(cost.used)}</b></div>
            <div style={{ marginTop: 10 }}>
              <div className="bar2" aria-hidden>
                <span style={{ width: `${cost.bought ? (cost.used / cost.bought) * 100 : 0}%` }} />
                <span style={{ flex: 1 }} />
              </div>
              <p className="muted small" style={{ margin: '8px 0 0' }}>
                {money(cost.leftover)} of what you buy is left over in packages (rice, spices, half a bag of onions) for next week.
              </p>
            </div>
          </div>
        </section>
      )}

      <div style={{ height: 70 }} />
      <div className="fab">
        <button className="btn btn-primary" onClick={onOpenList}>
          <IconList /> Grocery list · {listCount} items
        </button>
      </div>

      {swapDay !== null && (
        <SwapSheet
          day={swapDay}
          days={days}
          onClose={() => setSwapDay(null)}
          onPick={async (r) => {
            await app.setPlanDays(days.map((d, j) => (j === swapDay ? { recipeId: r.id, locked: d.locked } : d)));
            setSwapDay(null);
            showToast(`${DAY_NAMES[swapDay]}: ${r.title}`);
          }}
          onClear={
            recipes[swapDay]
              ? async () => {
                  await app.setPlanDays(days.map((d, j) => (j === swapDay ? { recipeId: null, locked: false } : d)));
                  setSwapDay(null);
                }
              : undefined
          }
        />
      )}
      {open && <RecipeSheet recipe={open} onClose={() => setOpen(null)} />}
      {toast}
    </>
  );
}

type SortKey = 'cost' | 'protein' | 'time';

function SwapSheet({
  day,
  days,
  onClose,
  onPick,
  onClear,
}: {
  day: number;
  days: PlanDay[];
  onClose: () => void;
  onPick: (r: Recipe) => void;
  onClear?: () => void;
}) {
  const app = useApp();
  const [sort, setSort] = useState<SortKey>('cost');
  const budget = app.settings.weeklyBudget;
  const options = useMemo(() => swapOptions({ ...app.planInput(days), current: days }, day), [app, days, day]);
  const sorted = useMemo(() => {
    const o = [...options];
    if (sort === 'protein') o.sort((a, b) => b.protein - a.protein);
    if (sort === 'time') o.sort((a, b) => a.recipe.minutes - b.recipe.minutes);
    return o;
  }, [options, sort]);

  return (
    <Sheet onClose={onClose} title={`Swap ${DAY_NAMES[day]}`} sub="Each option shows your new weekly total.">
      <div className="stack">
        <Segmented<SortKey>
          value={sort}
          onChange={setSort}
          options={[
            { value: 'cost', label: 'Cheapest' },
            { value: 'protein', label: 'Most protein' },
            { value: 'time', label: 'Fastest' },
          ]}
        />
        {sorted.length === 0 && <div className="notice">No other dinners match your diet, kitchen and skips. Loosen a filter in Settings.</div>}
        {sorted.map((o) => {
          const cls = o.weekTotal > budget ? 'delta-over' : o.delta <= 0 ? 'delta-down' : 'delta-up';
          return (
            <button key={o.recipe.id} className="swap-row" onClick={() => onPick(o.recipe)}>
              <span className="thumb" style={{ background: recipeTint(o.recipe) }} aria-hidden>{recipeEmoji(o.recipe)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', lineHeight: 1.2 }}>{o.recipe.title}</b>
                <span className="muted small">{o.protein}g protein · {o.recipe.minutes} min</span>
              </span>
              <span className="total">
                <b className="num">{money(o.weekTotal)}</b>
                <span className={`small ${cls}`}>
                  {o.delta === 0 ? '±$0.00' : `${o.delta > 0 ? '+' : '−'}${money(Math.abs(o.delta))}`}
                </span>
              </span>
            </button>
          );
        })}
        {onClear && (
          <button className="btn btn-text" onClick={onClear}>
            No dinner this night
          </button>
        )}
      </div>
    </Sheet>
  );
}
