import { REGION_LABEL, regionForZip } from '../engine/region';
import { useMemo, useState } from 'react';
import { AISLE_ORDER, STORES, STORE_BY_ID } from '../data';
import { mergeNeeds } from '../engine/cost';
import { bulkHint, resolvePrice, unitPrice } from '../engine/prices';
import { bestUnit, EDITOR_UNITS, sizeLabel, toBase, type SizeUnit } from '../engine/sizes';
import { useApp } from '../state/store';
import type { Aisle, DietTag, Ingredient, Recipe, ResolvedPrice, StoreId, Unit } from '../types';
import { formatUnitPrice, money } from './format';
import { IconPlus, IconSearch } from './icons';
import { Segmented, Sheet, useToast } from './kit';
import { STORE_LOGO, StoreMark } from './prefs';
import { ReceiptSheet } from './ReceiptSheet';

type Filter = 'all' | 'week' | 'edited';

export function sourceTag(p: ResolvedPrice) {
  if (p.source === 'live') return <span className="tag live" title={p.sourceName}>Live</span>;
  if (p.source === 'community')
    return (
      <span className="tag shoppers" title={`Median of ${p.reports} shopper receipts (Open Prices), latest ${p.updatedAt}`}>
        Shoppers · {p.reports}
      </span>
    );
  if (p.source === 'user') return <span className="tag user">Edited</span>;
  if (p.tracksLive) return <span className="tag" title="Estimate adjusted by today’s live Kroger price">Est. · live-tracked</span>;
  return <span className="tag">Estimate</span>;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function PricesScreen() {
  const app = useApp();
  const [storeId, setStoreId] = useState<StoreId>(app.settings.storeId);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, showToast] = useToast();
  const store = STORE_BY_ID[storeId];

  const weekIds = useMemo(() => {
    const planned = (app.plan?.days ?? []).map((d) => (d.recipeId ? app.recipeById.get(d.recipeId) : undefined)).filter((r): r is Recipe => !!r);
    return new Set(mergeNeeds(planned, app.settings.servings).keys());
  }, [app.plan, app.recipeById, app.settings.servings]);

  const editedHere = [...app.overrides.values()].filter((o) => o.storeId === storeId).length;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const m = new Map<Aisle, Ingredient[]>();
    for (const ing of Object.values(app.ingredients)) {
      if (needle && !ing.name.toLowerCase().includes(needle)) continue;
      if (filter === 'week' && !weekIds.has(ing.id)) continue;
      if (filter === 'edited' && !app.overrides.has(`${storeId}:${ing.id}`)) continue;
      const list = m.get(ing.aisle) ?? [];
      list.push(ing);
      m.set(ing.aisle, list);
    }
    return AISLE_ORDER.filter((a) => m.has(a)).map((a) => [a, m.get(a)!.sort((x, y) => x.name.localeCompare(y.name))] as const);
  }, [q, filter, app.ingredients, app.overrides, storeId, weekIds]);

  return (
    <>
      <h1 className="display">Prices</h1>
      <p className="lede">Tap any item to set the price you actually pay.</p>

      {/* Store switcher */}
      <div className="store-strip" role="tablist" aria-label="Store">
        {STORES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === storeId}
            className="store-pill"
            onClick={() => setStoreId(s.id)}
            title={s.name}
            ref={(el) => {
              if (el && s.id === storeId) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
            }}
          >
            {app.settings.showLogos && STORE_LOGO[s.id] ? <img src={STORE_LOGO[s.id]} alt={s.name} /> : (
              <span className="row" style={{ gap: 6 }}>
                <StoreMark id={s.id} size={24} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Where the numbers come from */}
      <SourceCard storeId={storeId} />

      <div className="stack" style={{ marginTop: 14 }}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'week', label: 'This week' },
            { value: 'edited', label: `Edited${editedHere ? ` (${editedHere})` : ''}` },
          ]}
        />
        <div className="row">
          <div className="search" style={{ flex: 1 }}>
            <IconSearch />
            <input className="input" placeholder="Search ingredients" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-dark" style={{ minHeight: 52 }} onClick={() => setAdding(true)} aria-label="Add ingredient">
            <IconPlus /> Add
          </button>
        </div>
        <button className="btn scan-btn" onClick={() => setScanning(true)}>
          <span aria-hidden>🧾</span> Scan a receipt to update {store.name} prices
        </button>
      </div>

      {groups.length === 0 && (
        <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
          <p className="muted">{filter === 'edited' ? `No edited prices at ${store.name} yet.` : 'Nothing matches.'}</p>
        </div>
      )}

      {groups.map(([aisle, items]) => (
        <section key={aisle}>
          <div className="eyebrow aisle">{aisle}</div>
          <div className="list">
            {items.map((ing) => {
              const p = resolvePrice(storeId, ing, app.priceCtx);
              const hint = bulkHint(storeId, ing, app.priceCtx);
              return (
                <button key={ing.id} className="list-row price-row" onClick={() => setEditing(ing)}>
                  <div className="name">
                    <b>{ing.name}</b>
                    {ing.custom && <span className="tag" style={{ marginLeft: 6 }}>Yours</span>}
                    <div className="muted small">
                      {p.label} · {formatUnitPrice(unitPrice(p), ing.unit)}
                    </div>
                    {hint && (
                      <div className="small" style={{ color: 'var(--good)', fontWeight: 700 }}>
                        Costco bulk is {Math.round(hint.savingPct * 100)}% cheaper per unit
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 17 }}>{money(p.price)}</div>
                    {sourceTag(p)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {editedHere > 0 && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            className="btn btn-text"
            onClick={async () => {
              if (!confirm(`Reset all ${editedHere} edited prices at ${store.name}?`)) return;
              const n = await app.resetStorePrices(storeId);
              showToast(`Reset ${n} prices`);
            }}
          >
            Reset all {editedHere} edits at {store.name}
          </button>
        </div>
      )}

      {editing && <PriceSheet ing={editing} storeId={storeId} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); showToast(m); }} />}
      {adding && <AddIngredientSheet storeId={storeId} onClose={() => setAdding(false)} onSaved={(m) => { setAdding(false); showToast(m); }} />}
      {scanning && <ReceiptSheet defaultStore={storeId} onClose={() => setScanning(false)} onSaved={(m, sid) => { setScanning(false); setStoreId(sid); setFilter('edited'); showToast(m); }} />}
      {toast}
    </>
  );
}

// ── Edit one price ──────────────────────────────────────────────
function PriceSheet({ ing, storeId, onClose, onSaved }: { ing: Ingredient; storeId: StoreId; onClose: () => void; onSaved: (msg: string) => void }) {
  const app = useApp();
  const current = resolvePrice(storeId, ing, app.priceCtx);
  const start = bestUnit(current.size, ing.unit);
  const [price, setPrice] = useState(String(current.price));
  const [qty, setQty] = useState(String(start.value));
  const [unit, setUnit] = useState<SizeUnit>(start.unit);
  const [label, setLabel] = useState(current.source === 'user' ? current.label : '');
  const store = STORE_BY_ID[storeId];

  const priceN = Number(price);
  const qtyN = Number(qty);
  const valid = priceN > 0 && qtyN > 0 && Number.isFinite(priceN) && Number.isFinite(qtyN);
  const size = valid ? toBase(qtyN, unit).amount : 0;
  const preview = valid ? priceN / size : 0;

  const compare = STORES.map((s) => ({ s, p: resolvePrice(s.id, ing, app.priceCtx) })).sort((a, b) => unitPrice(a.p) - unitPrice(b.p));
  const cheapest = compare[0];

  return (
    <Sheet onClose={onClose} title={ing.name} sub={<>{store.name} · now {money(current.price)} for {current.label} {sourceTag(current)}</>}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="card stack">
          <label className="field">
            <span>Shelf price</span>
            <div className="money-input">
              <span>$</span>
              <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price in dollars" />
            </div>
          </label>
          <div className="field">
            <span>Pack size</span>
            <div className="row" style={{ gap: 8 }}>
              <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Pack size" style={{ flex: 1 }} />
              <select className="select" value={unit} onChange={(e) => setUnit(e.target.value as SizeUnit)} aria-label="Pack unit" style={{ width: 110 }}>
                {EDITOR_UNITS[ing.unit].map((u) => (
                  <option key={u} value={u}>{u === 'ct' ? 'count' : u}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="field">
            <span>Label <span className="muted">(optional)</span></span>
            <input className="input" placeholder={valid ? sizeLabel(qtyN, unit) : 'e.g. 3 lb bag'} value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <div className="muted small" style={{ fontWeight: 700 }}>
            {valid ? <>That’s {formatUnitPrice(preview, ing.unit)}</> : 'Enter a price and pack size'}
          </div>
          <button
            className="btn btn-primary"
            disabled={!valid}
            onClick={async () => {
              await app.setPrice(storeId, ing.id, { size, price: Math.round(priceN * 100) / 100, label: label.trim() || sizeLabel(qtyN, unit) });
              onSaved(`${ing.name} saved for ${store.name}`);
            }}
          >
            Save price
          </button>
          {current.source === 'user' && (
            <button
              className="btn btn-text"
              onClick={async () => {
                await app.resetPrice(storeId, ing.id);
                onSaved(`${ing.name} reset to ${app.live && store.liveCapable && app.live.prices[ing.id] ? 'live' : 'estimate'}`);
              }}
            >
              Reset to {app.live && store.liveCapable && app.live.prices[ing.id] ? 'live price' : 'estimate'}
            </button>
          )}
        </div>

        <div>
          <div className="section-head"><h2 style={{ fontSize: 17 }}>Where it’s cheapest</h2><span className="muted small">per unit</span></div>
          <div className="list">
            {compare.map(({ s, p }) => (
              <div key={s.id} className={`list-row${s.id === storeId ? ' here' : ''}`}>
                <span className="cmp-logo">{app.settings.showLogos && STORE_LOGO[s.id] ? <img src={STORE_LOGO[s.id]} alt="" /> : <StoreMark id={s.id} size={24} />}</span>
                <div className="name">
                  <b style={{ fontSize: 14 }}>{s.name}</b>
                  <div className="muted small">{money(p.price)} · {p.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontSize: 14 }}>{formatUnitPrice(unitPrice(p), ing.unit)}</div>
                  {s.id === cheapest.s.id ? <span className="tag hot">Cheapest</span> : sourceTag(p)}
                </div>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ margin: '8px 4px 0' }}>Comparisons use estimates unless a price is live or edited.</p>
        </div>

        {ing.custom && (
          <button
            className="btn btn-text"
            style={{ color: 'var(--warn)' }}
            onClick={async () => {
              if (!confirm(`Delete ${ing.name}? Recipes using it will show it without a price.`)) return;
              await app.deleteIngredient(ing.id);
              onSaved(`${ing.name} deleted`);
            }}
          >
            Delete this ingredient
          </button>
        )}
      </div>
    </Sheet>
  );
}

// ── Add an ingredient ───────────────────────────────────────────
const AISLES: Aisle[] = AISLE_ORDER;
const DIET_OPTIONS: { value: DietTag; label: string }[] = [
  { value: 'plant', label: 'Plant' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'egg', label: 'Egg' },
  { value: 'fish', label: 'Fish/seafood' },
  { value: 'poultry', label: 'Poultry' },
  { value: 'meat', label: 'Red meat/pork' },
];

export function slugId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'item';
  return `my-${base}-${Math.random().toString(36).slice(2, 6)}`;
}

function AddIngredientSheet({ storeId, onClose, onSaved }: { storeId: StoreId; onClose: () => void; onSaved: (msg: string) => void }) {
  const app = useApp();
  const store = STORE_BY_ID[storeId];
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState<Aisle>('Produce');
  const [unitKind, setUnitKind] = useState<Unit>('g');
  const [diet, setDiet] = useState<DietTag>('plant');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('lb');
  const [n, setN] = useState({ kcal: '', protein: '', carbs: '', fat: '' });

  const priceN = Number(price);
  const qtyN = Number(qty);
  const valid = name.trim().length > 1 && priceN > 0 && qtyN > 0;
  const per = unitKind === 'each' ? 'per piece' : unitKind === 'g' ? 'per 100 g' : 'per 100 ml';

  return (
    <Sheet onClose={onClose} title="Add an ingredient" sub={`Priced at ${store.name}. Other stores get an estimate you can edit.`}>
      <div className="card stack">
        <label className="field">
          <span>Name</span>
          <input className="input" placeholder="e.g. Halloumi" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="row" style={{ gap: 8 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>Aisle</span>
            <select className="select" value={aisle} onChange={(e) => setAisle(e.target.value as Aisle)}>
              {AISLES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Type</span>
            <select className="select" value={diet} onChange={(e) => setDiet(e.target.value as DietTag)}>
              {DIET_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
        </div>
        <div className="field">
          <span>Measured by</span>
          <Segmented<Unit>
            value={unitKind}
            onChange={(u) => {
              setUnitKind(u);
              setSizeUnit(EDITOR_UNITS[u][0]);
            }}
            options={[
              { value: 'g', label: 'Weight' },
              { value: 'ml', label: 'Volume' },
              { value: 'each', label: 'Count' },
            ]}
          />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>Price</span>
            <div className="money-input">
              <span>$</span>
              <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>Pack size</span>
            <div className="row" style={{ gap: 6 }}>
              <input className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} style={{ minWidth: 0 }} />
              <select className="select" value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value as SizeUnit)} style={{ width: 84 }}>
                {EDITOR_UNITS[unitKind].map((u) => <option key={u} value={u}>{u === 'ct' ? 'ct' : u}</option>)}
              </select>
            </div>
          </label>
        </div>
        <details>
          <summary className="muted small" style={{ fontWeight: 700, cursor: 'pointer' }}>Nutrition {per} (optional, estimate)</summary>
          <div className="macro-grid" style={{ marginTop: 10 }}>
            {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
              <label key={k} className="field">
                <span className="small">{k === 'kcal' ? 'kcal' : `${k} g`}</span>
                <input className="input" inputMode="decimal" value={n[k]} onChange={(e) => setN({ ...n, [k]: e.target.value })} />
              </label>
            ))}
          </div>
        </details>
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={async () => {
            const size = toBase(qtyN, sizeUnit).amount;
            const label = sizeLabel(qtyN, sizeUnit);
            const id = slugId(name);
            const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);
            const ing: Ingredient = {
              id,
              name: name.trim(),
              aisle,
              unit: unitKind,
              diet,
              nutrition: { kcal: num(n.kcal), protein: num(n.protein), carbs: num(n.carbs), fat: num(n.fat) },
              base: { size, price: priceN, label },
              custom: true,
            };
            await app.addIngredient(ing);
            await app.setPrice(storeId, id, { size, price: Math.round(priceN * 100) / 100, label });
            onSaved(`${ing.name} added`);
          }}
        >
          Add ingredient
        </button>
      </div>
    </Sheet>
  );
}

function SourceCard({ storeId }: { storeId: StoreId }) {
  const app = useApp();
  const store = STORE_BY_ID[storeId];
  const live = storeId === 'kroger' ? app.live : app.liveState.liveByStore[storeId];
  const community = app.liveState.community?.stores[storeId];
  // Count only shopper prices that pass the freshness, report-count and plausibility checks.
  const communityCount = community
    ? Object.keys(community).filter((id) => app.ingredients[id] && resolvePrice(storeId, app.ingredients[id], app.priceCtx).source === 'community').length
    : 0;
  const server = app.liveState.status.server;
  const region = app.liveState.regional ? regionForZip(app.settings.zip) : null;

  if (live) {
    return (
      <section className="hero" style={{ marginTop: 14 }}>
        <div className="row">
          <span className="tag live">Live</span>
          <b>{store.name} prices, updated {shortDate(live.fetchedAt)}</b>
        </div>
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          {Object.keys(live.prices).length} items from the official {live.source}
          {live.locationName ? ` at ${live.locationName}` : storeId === 'walmart' ? ' (walmart.com prices)' : ''}.
          {live.reference ? ' No Kroger store near you, so this is a reference market — other estimates are scaled to your region.' : ''}
          {communityCount ? ` Plus ${communityCount} shopper-reported prices.` : ''} Your edits still win.
        </p>
      </section>
    );
  }
  return (
    <section className="card" style={{ marginTop: 14 }}>
      <b>
        {communityCount ? `🧾 ${communityCount} real shopper prices at ${store.name}` : store.liveCapable ? '📡 Live prices are ready to switch on' : `🏷️ ${store.name} prices are estimates`}
      </b>
      <p className="muted small" style={{ margin: '6px 0 0' }}>
        {communityCount
          ? 'From receipts people shared on Open Prices (Open Food Facts), within the last year. Everything else is an estimate'
          : store.liveCapable
            ? 'Add your ZIP and a price server in Settings → Live prices to get your nearest store’s prices daily. Until then these are estimates'
            : `${store.name} has no public price feed, so most prices are estimates`}
        {app.live && !store.liveCapable ? ', nudged by today’s live Kroger market' : ''}
        {region ? `${app.live && !store.liveCapable ? ' and' : ','} adjusted to ${REGION_LABEL[region]} price levels (BLS)` : ''}. Edit what you buy most to match your receipt.
        {storeId === 'walmart' && server !== 'ok' ? ' Live walmart.com prices turn on when your price server has Walmart affiliate keys.' : ''}
      </p>
    </section>
  );
}
