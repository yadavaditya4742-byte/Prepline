import { useEffect, useMemo, useState } from 'react';
import { AISLE_ORDER, STORE_BY_ID } from '../data';
import { weekCost } from '../engine/cost';
import { groupByAisle, listAsText } from '../engine/shopping';
import { addDays, monthDay } from '../engine/week';
import { useApp } from '../state/store';
import type { Recipe } from '../types';
import { formatQty, money } from './format';
import { IconCheck, IconCopy, IconShare } from './icons';
import { useToast } from './kit';

/** In-cart ticks are a per-device convenience for this week only. */
function useCartTicks(weekStart: string) {
  const key = `prepline:cart:${weekStart}`;
  const [ticks, setTicks] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) ?? '[]'));
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...ticks]));
    } catch {
      /* storage unavailable: ticks just won't persist */
    }
  }, [key, ticks]);
  const toggle = (id: string) =>
    setTicks((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return [ticks, toggle] as const;
}

export function ListScreen() {
  const app = useApp();
  const { settings, plan, recipeById } = app;
  const [ticks, toggleTick] = useCartTicks(app.weekStart);
  const [toast, showToast] = useToast();
  const [showPantry, setShowPantry] = useState(false);

  const planned = (plan?.days ?? []).map((d) => (d.recipeId ? recipeById.get(d.recipeId) : undefined)).filter((r): r is Recipe => !!r);
  const cost = useMemo(() => weekCost(planned, settings.servings, app.priceOf, app.pantry), [planned, settings.servings, app.priceOf, app.pantry]);
  const { groups, pantry } = useMemo(() => groupByAisle(cost, app.ingredients, AISLE_ORDER), [cost, app.ingredients]);
  const itemCount = groups.reduce((n, g) => n + g.lines.length, 0);
  const gotCount = groups.reduce((n, g) => n + g.lines.filter((l) => ticks.has(l.ingredientId)).length, 0);
  const store = STORE_BY_ID[settings.storeId];
  const weekLabel = `week of ${monthDay(addDays(app.weekStart, 0))}`;
  const text = () => listAsText({ storeName: store.name, weekLabel, groups, ingredients: app.ingredients, total: cost.bought });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      showToast('List copied');
    } catch {
      showToast('Copy not available here');
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Grocery list', text: text() });
      } catch {
        /* user cancelled */
      }
    } else void copy();
  };

  if (!planned.length) {
    return (
      <>
        <h1 className="display">Grocery list</h1>
        <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40 }}>🧺</div>
          <p className="muted">Plan a dinner or two and your list builds itself here.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="display">Grocery list</h1>
      <p className="lede">{store.name} · {itemCount} items · {planned.length} dinners</p>

      <section className="hero" style={{ marginTop: 18 }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="small muted" style={{ fontWeight: 700 }}>To spend at the register</div>
            <div className="num" style={{ fontSize: 40, lineHeight: 1.1 }}>{money(cost.bought)}</div>
          </div>
          <span className="spacer" />
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontSize: 22 }}>{gotCount}/{itemCount}</div>
            <div className="small muted">in the cart</div>
          </div>
        </div>
        <div className="meter" style={{ marginTop: 14 }}>
          <span style={{ width: `${itemCount ? (gotCount / itemCount) * 100 : 0}%` }} />
        </div>
        <div className="row" style={{ marginTop: 16, gap: 8 }}>
          <button className="btn" style={{ flex: 1, background: 'var(--accent)', color: 'var(--accent-ink)' }} onClick={share}>
            <IconShare /> Share
          </button>
          <button className="btn" style={{ flex: 1, background: 'rgb(255 255 255 / 10%)', color: 'var(--hero-ink)' }} onClick={copy}>
            <IconCopy /> Copy
          </button>
        </div>
      </section>

      {!store.liveCapable && (
        <div className="notice" style={{ marginTop: 14 }}>
          <span className="emoji">🏷️</span>
          <span>{store.name} prices are estimates. Edit any of them in Prices to match your receipt.</span>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.aisle}>
          <div className="eyebrow aisle">{g.aisle}</div>
          <div className="list">
            {g.lines.map((l) => {
              const ing = app.ingredients[l.ingredientId];
              const got = ticks.has(l.ingredientId);
              return (
                <div className={`list-row${got ? ' done' : ''}`} key={l.ingredientId}>
                  <button className={`check${got ? ' on' : ''}`} aria-label={got ? `Untick ${ing.name}` : `Tick ${ing.name}`} aria-pressed={got} onClick={() => toggleTick(l.ingredientId)}>
                    {got && <IconCheck />}
                  </button>
                  <div className="name">
                    <b>{ing.name}</b>
                    <div className="muted small">
                      Need {formatQty(l.need, ing.unit)} · buy {l.packs} × {l.price?.label ?? '?'}
                      {l.price?.source === 'live' && <span className="tag live" style={{ marginLeft: 6 }}>Live</span>}
                      {l.price?.source === 'user' && <span className="tag user" style={{ marginLeft: 6 }}>Edited</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 16 }}>{money(l.bought)}</div>
                    <button className="have-btn" onClick={() => app.togglePantry(l.ingredientId, true)}>Have it</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {pantry.length > 0 && (
        <section className="section">
          <button className="section-head" style={{ all: 'unset', cursor: 'pointer', display: 'flex', width: '100%', margin: '0 4px 10px' }} onClick={() => setShowPantry(!showPantry)}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Already in your pantry</h2>
            <span className="spacer" />
            <span className="muted small" style={{ fontWeight: 700 }}>{pantry.length} · {showPantry ? 'Hide' : 'Show'}</span>
          </button>
          {showPantry && (
            <div className="list">
              {pantry.map((l) => {
                const ing = app.ingredients[l.ingredientId];
                return (
                  <div className="list-row" key={l.ingredientId}>
                    <div className="name">
                      <b>{ing.name}</b>
                      <div className="muted small">Using {formatQty(l.need, ing.unit)} · $0.00</div>
                    </div>
                    <button className="have-btn" onClick={() => app.togglePantry(l.ingredientId, false)}>Need it</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
      {toast}
    </>
  );
}
