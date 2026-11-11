import { useMemo, useState } from 'react';
import { AISLE_ORDER, INGREDIENTS, STORES } from '../data';
import { bulkHint, resolvePrice, unitPrice } from '../engine/prices';
import type { Ingredient, StoreId } from '../types';
import { formatUnitPrice, money } from './format';

/** Stage 1: read-only view of the seed price table. Editing arrives in Stage 3. */
export function PricesPreview() {
  const [storeId, setStoreId] = useState<StoreId>('kroger');
  const [q, setQ] = useState('');
  const ctx = useMemo(() => ({ overrides: new Map() }), []);
  const store = STORES.find((s) => s.id === storeId)!;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const m = new Map<string, Ingredient[]>();
    for (const ing of INGREDIENTS) {
      if (needle && !ing.name.toLowerCase().includes(needle)) continue;
      const list = m.get(ing.aisle) ?? [];
      list.push(ing);
      m.set(ing.aisle, list);
    }
    return AISLE_ORDER.filter((a) => m.has(a)).map((a) => [a, m.get(a)!] as const);
  }, [q]);

  return (
    <>
      <h1 className="screen-title">Prices</h1>
      <p className="screen-sub">{INGREDIENTS.length} ingredients · {STORES.length} stores</p>

      <div className="stack">
        <div className="row">
          <select className="select" value={storeId} onChange={(e) => setStoreId(e.target.value as StoreId)} aria-label="Store">
            {STORES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <p className="muted small" style={{ margin: 0 }}>{store.note}</p>
        <div className="notice">
          {store.liveCapable
            ? 'Live prices for Kroger-family stores come from Kroger’s free public API once the daily price job is set up (Stage 3). Until then, these are estimates.'
            : `${store.name} has no free public price feed, so these are estimated shelf prices. You’ll be able to edit any of them to match your receipt.`}
        </div>
        <input className="input" placeholder="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {groups.map(([aisle, items]) => (
        <section key={aisle}>
          <h2 className="aisle-head">{aisle}</h2>
          <div className="list">
            {items.map((ing) => {
              const p = resolvePrice(storeId, ing, ctx);
              const hint = bulkHint(storeId, ing, ctx);
              return (
                <div className="list-row" key={ing.id}>
                  <div className="name">
                    <div>{ing.name}</div>
                    <div className="muted small">
                      {p.label} · {formatUnitPrice(unitPrice(p), ing.unit)}
                      {hint && (
                        <span style={{ color: 'var(--good)' }}> · Costco {Math.round(hint.savingPct * 100)}% cheaper per {ing.unit === 'each' ? 'item' : 'lb'}</span>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${p.source}`}>{p.source === 'seed' ? 'Estimate' : p.source === 'live' ? 'Live' : 'Edited'}</span>
                  <span className="num" style={{ fontSize: 18, minWidth: 56, textAlign: 'right' }}>{money(p.price)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
