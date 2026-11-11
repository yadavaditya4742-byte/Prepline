import { useMemo, useState } from 'react';
import { AISLE_ORDER, STORES } from '../data';
import { bulkHint, resolvePrice, unitPrice } from '../engine/prices';
import { useApp } from '../state/store';
import type { Ingredient, StoreId } from '../types';
import { formatUnitPrice, money } from './format';
import { IconSearch } from './icons';

/** Read-only price table. Editing arrives in stage 3. */
export function PricesPreview() {
  const app = useApp();
  const [storeId, setStoreId] = useState<StoreId>(app.settings.storeId);
  const [q, setQ] = useState('');
  const store = STORES.find((s) => s.id === storeId)!;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const m = new Map<string, Ingredient[]>();
    for (const ing of Object.values(app.ingredients)) {
      if (needle && !ing.name.toLowerCase().includes(needle)) continue;
      const list = m.get(ing.aisle) ?? [];
      list.push(ing);
      m.set(ing.aisle, list);
    }
    return AISLE_ORDER.filter((a) => m.has(a)).map((a) => [a, m.get(a)!] as const);
  }, [q, app.ingredients]);

  return (
    <>
      <h1 className="display">Prices</h1>
      <p className="lede">{Object.keys(app.ingredients).length} ingredients · {STORES.length} stores</p>

      <div className="stack" style={{ marginTop: 18 }}>
        <select className="select" value={storeId} onChange={(e) => setStoreId(e.target.value as StoreId)} aria-label="Store">
          {STORES.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="notice">
          <span className="emoji">{store.liveCapable ? '📡' : '🏷️'}</span>
          <span>
            {store.liveCapable
              ? 'Kroger-family prices switch to live once the daily price job is connected. Until then these are estimates.'
              : `${store.name} has no free public price feed, so these are estimated shelf prices. Editing arrives in the next stage.`}
          </span>
        </div>
        <div className="search">
          <IconSearch />
          <input className="input" placeholder="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {groups.map(([aisle, items]) => (
        <section key={aisle}>
          <div className="eyebrow aisle">{aisle}</div>
          <div className="list">
            {items.map((ing) => {
              const p = resolvePrice(storeId, ing, app.priceCtx);
              const hint = bulkHint(storeId, ing, app.priceCtx);
              return (
                <div className="list-row" key={ing.id}>
                  <div className="name">
                    <b>{ing.name}</b>
                    <div className="muted small">
                      {p.label} · {formatUnitPrice(unitPrice(p), ing.unit)}
                    </div>
                    {hint && (
                      <div className="small" style={{ color: 'var(--good)', fontWeight: 700 }}>
                        Costco bulk is {Math.round(hint.savingPct * 100)}% cheaper per {ing.unit === 'each' ? 'item' : ing.unit === 'ml' ? 'fl oz' : 'lb'}
                      </div>
                    )}
                  </div>
                  <span className={`tag ${p.source}`}>{p.source === 'seed' ? 'Estimate' : p.source === 'live' ? 'Live' : 'Edited'}</span>
                  <span className="num" style={{ fontSize: 17, minWidth: 58, textAlign: 'right' }}>{money(p.price)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
