import { useMemo, useState } from 'react';
import { INGREDIENTS, STORES } from '../data';
import { dietLabel, fitsDiet, FOOD_GROUPS, matchingPreset, presetTags } from '../engine/diet';
import { DAY_SHORT } from '../engine/week';
import type { Appliance, Cuisine, DietPreset, DietTag, Priority, StoreId } from '../types';
import { IconCheck, IconSearch } from './icons';
import { Chip } from './kit';
import { KitchenScene } from './KitchenScene';
import { CUISINE_EMOJI } from './visuals';
import { useApp } from '../state/store';

// ── Store ─────────────────────────────────────────────────────
const STORE_STYLE: Record<StoreId, { mono: string; color: string; tag?: string }> = {
  kroger: { mono: 'K', color: '#2f5d9e', tag: 'Live prices' },
  walmart: { mono: 'W', color: '#3a7bd5', tag: 'Live-ready' },
  costco: { mono: 'C', color: '#b33a3a', tag: 'Bulk' },
  target: { mono: 'T', color: '#c2453d' },
  aldi: { mono: 'A', color: '#24427a' },
  traderjoes: { mono: 'TJ', color: '#b8452f' },
  wholefoods: { mono: 'WF', color: '#2f6b4f' },
  safeway: { mono: 'S', color: '#a8433a' },
  publix: { mono: 'P', color: '#3c7d3e' },
  heb: { mono: 'H', color: '#c23b32' },
  desi: { mono: '🌶️', color: '#c27a12', tag: 'Desi staples' },
};

// Store logos are bundled from src/assets/logos/<storeId>.svg|png (works offline).
const LOGO_FILES = import.meta.glob('../assets/logos/*.{svg,png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const STORE_LOGO: Partial<Record<StoreId, string>> = Object.fromEntries(
  Object.entries(LOGO_FILES).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url]),
);

export function StoreMark({ id, size = 34 }: { id: StoreId; size?: number }) {
  const st = STORE_STYLE[id];
  return (
    <span className="mono" style={{ background: st.color, width: size, height: size }} aria-hidden>
      {st.mono}
    </span>
  );
}

export function StorePicker({ value, onChange }: { value: StoreId; onChange: (s: StoreId) => void }) {
  const showLogos = useApp().settings.showLogos;
  return (
    <div className="store-grid">
      {STORES.map((s) => {
        const st = STORE_STYLE[s.id];
        return (
          <button key={s.id} type="button" className="store-card" aria-pressed={value === s.id} onClick={() => onChange(s.id)} aria-label={s.name}>
            {st.tag && <span className={`tag${st.tag === 'Live prices' ? ' live' : ''}`}>{st.tag}</span>}
            <span className="store-logo">
              {showLogos && STORE_LOGO[s.id] ? (
                <img src={STORE_LOGO[s.id]} alt="" draggable={false} />
              ) : (
                <span className="row" style={{ gap: 8 }}>
                  <StoreMark id={s.id} size={36} />
                  <span className="name">{s.name}</span>
                </span>
              )}
            </span>
            <span>
              <span className="muted small" style={{ display: 'block', lineHeight: 1.3, marginTop: 2 }}>
                {s.id === 'kroger' ? 'Ralphs, Fred Meyer, King Soopers & more' : s.note}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Diet (mix and match) ──────────────────────────────────────
const PRESETS: { id: DietPreset; label: string; emoji: string }[] = [
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥕' },
  { id: 'eggetarian', label: 'Veg + eggs', emoji: '🥚' },
  { id: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
  { id: 'chicken-fish', label: 'Chicken & fish', emoji: '🍗' },
  { id: 'everything', label: 'Everything', emoji: '🥩' },
];

export function DietPicker({ value, onChange }: { value: DietTag[]; onChange: (eats: DietTag[]) => void }) {
  const app = useApp();
  const has = new Set(value);
  const preset = matchingPreset(value);
  const count = app.recipes.filter((r) => fitsDiet(r, value, app.ingredients)).length;
  const toggle = (t: DietTag) => onChange(has.has(t) ? value.filter((x) => x !== t) : [...value, t]);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <div className="field-label">Tap everything you eat</div>
        <div className="chips">
          <Chip selected emoji="🌱">Plants, beans & lentils</Chip>
          {FOOD_GROUPS.map((g) => (
            <Chip key={g.tag} emoji={g.emoji} selected={has.has(g.tag)} onClick={() => toggle(g.tag)}>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="notice">
        <span className="emoji">🍽️</span>
        <span>
          <b>{dietLabel(value)}</b> · {count} dinners to choose from.
          {has.size > 1 && !preset ? ' Your week mixes them, so it’s never all one thing.' : ''}
        </span>
      </div>

      <div>
        <div className="field-label">Or start from a common diet</div>
        <div className="chips">
          {PRESETS.map((p) => (
            <Chip key={p.id} small emoji={p.emoji} selected={preset === p.id} onClick={() => onChange(presetTags(p.id).filter((t) => t !== 'plant'))}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cuisines (mix and match) ──────────────────────────────────
export const ALL_CUISINES: Cuisine[] = ['Indian', 'Mediterranean', 'Middle Eastern', 'Mexican', 'East Asian', 'Southeast Asian', 'Italian', 'American', 'Caribbean', 'African'];

export function CuisinePicker({ value, onChange, eats }: { value: Cuisine[]; onChange: (c: Cuisine[]) => void; eats: DietTag[] }) {
  const app = useApp();
  const counts = useMemo(() => {
    const m = new Map<Cuisine, number>();
    for (const r of app.recipes) if (!r.user && fitsDiet(r, eats, app.ingredients)) m.set(r.cuisine, (m.get(r.cuisine) ?? 0) + 1);
    return m;
  }, [app.recipes, app.ingredients, eats]);
  const picked = new Set(value);
  const toggle = (c: Cuisine) => onChange(picked.has(c) ? value.filter((x) => x !== c) : [...value, c]);
  const total = value.reduce((n, c) => n + (counts.get(c) ?? 0), 0);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="chips">
        <Chip emoji="🌍" selected={value.length === 0} onClick={() => onChange([])}>
          Any cuisine
        </Chip>
        {ALL_CUISINES.filter((c) => counts.get(c)).map((c) => (
          <Chip key={c} emoji={CUISINE_EMOJI[c]} selected={picked.has(c)} onClick={() => toggle(c)}>
            {c} <span className="muted" style={{ fontWeight: 600, marginLeft: 4 }}>{counts.get(c)}</span>
          </Chip>
        ))}
      </div>
      {value.length > 0 && (
        <div className="notice">
          <span className="emoji">{total >= 9 ? '✨' : '💡'}</span>
          <span>
            {total >= 9
              ? `Your weeks will mix ${value.length === 1 ? value[0] : `${value.slice(0, -1).join(', ')} and ${value[value.length - 1]}`} (${total} dinners).`
              : `Only ${total} dinners fit. We’ll add a few from other cuisines so you don’t eat the same thing twice.`}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Kitchen ───────────────────────────────────────────────────
export const APPLIANCES: { id: Appliance; label: string; emoji: string }[] = [
  { id: 'stovetop', label: 'Stovetop', emoji: '🔥' },
  { id: 'oven', label: 'Oven', emoji: '♨️' },
  { id: 'air-fryer', label: 'Air fryer', emoji: '🌪️' },
  { id: 'pressure-cooker', label: 'Instant Pot / pressure cooker', emoji: '🍲' },
  { id: 'blender', label: 'Blender', emoji: '🥤' },
  { id: 'microwave', label: 'Microwave', emoji: '📡' },
  { id: 'grill', label: 'Grill', emoji: '🍢' },
];

export function KitchenPicker({ value, onChange }: { value: Appliance[]; onChange: (a: Appliance[]) => void }) {
  return <KitchenScene value={value} onChange={onChange} />;
}

// ── Priority ──────────────────────────────────────────────────
export const PRIORITIES: { id: Priority; label: string; sub: string; emoji: string }[] = [
  { id: 'protein', label: 'Most protein', sub: 'Lean-gains mode: protein-dense dinners first', emoji: '💪' },
  { id: 'cost', label: 'Lowest cost', sub: 'Stretch every dollar of the budget', emoji: '🪙' },
  { id: 'fast', label: 'Fastest', sub: 'Shortest cook times on busy nights', emoji: '⚡' },
  { id: 'balanced', label: 'Balanced', sub: 'A sensible mix of all three', emoji: '⚖️' },
];

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <div className="stack">
      {PRIORITIES.map((p) => (
        <button key={p.id} type="button" className="option-card" aria-pressed={value === p.id} onClick={() => onChange(p.id)}>
          <span className="emoji" aria-hidden>{p.emoji}</span>
          <span>
            <b>{p.label}</b>
            <span className="muted small">{p.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Days ──────────────────────────────────────────────────────
export function DaysPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  const toggle = (i: number) =>
    onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i].sort((a, b) => a - b));
  return (
    <div className="days">
      {DAY_SHORT.map((d, i) => (
        <button key={i} type="button" className="day-pill" aria-pressed={value.includes(i)} aria-label={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]} onClick={() => toggle(i)}>
          {d}
          <span className="ring">{value.includes(i) && <IconCheck />}</span>
        </button>
      ))}
    </div>
  );
}

// ── Skip (exclusions) ─────────────────────────────────────────
const SKIP_GROUPS: { label: string; emoji: string; ids: string[] }[] = [
  { label: 'Mushrooms', emoji: '🍄', ids: ['mushroom'] },
  { label: 'Eggplant', emoji: '🍆', ids: ['eggplant'] },
  { label: 'Cilantro', emoji: '🌿', ids: ['cilantro'] },
  { label: 'Bell peppers', emoji: '🫑', ids: ['bell-pepper'] },
  { label: 'Paneer', emoji: '🧀', ids: ['paneer'] },
  { label: 'Tofu & tempeh', emoji: '🥡', ids: ['tofu', 'tempeh'] },
  { label: 'Soy', emoji: '🫘', ids: ['tofu', 'tempeh', 'soy-chunks', 'edamame', 'soy-sauce'] },
  { label: 'Shrimp', emoji: '🦐', ids: ['shrimp'] },
  { label: 'Fish', emoji: '🐟', ids: ['salmon', 'tilapia', 'cod', 'tuna-can'] },
  { label: 'Coconut', emoji: '🥥', ids: ['coconut-milk'] },
  { label: 'Peanuts', emoji: '🥜', ids: ['peanuts', 'peanut-butter'] },
  { label: 'Tree nuts', emoji: '🌰', ids: ['cashews', 'almonds'] },
  { label: 'Sesame', emoji: '🥯', ids: ['sesame-seeds', 'sesame-oil', 'tahini'] },
  { label: 'Pork', emoji: '🐖', ids: ['pork-tenderloin'] },
  { label: 'Beef', emoji: '🐄', ids: ['ground-beef', 'sirloin'] },
  { label: 'Lamb', emoji: '🐑', ids: ['ground-lamb'] },
];

export function SkipPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const set = new Set(value);
  const groupOn = (g: { ids: string[] }) => g.ids.every((id) => set.has(id));
  const toggleGroup = (g: { ids: string[] }) => {
    const next = new Set(value);
    if (groupOn(g)) g.ids.forEach((id) => next.delete(id));
    else g.ids.forEach((id) => next.add(id));
    onChange([...next]);
  };
  const toggleOne = (id: string) => {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
    setQ('');
  };
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    return INGREDIENTS.filter((i) => i.name.toLowerCase().includes(n)).slice(0, 8);
  }, [q]);
  const groupIds = new Set(SKIP_GROUPS.flatMap((g) => g.ids));
  const extras = value.filter((id) => !groupIds.has(id));
  const nameOf = (id: string) => INGREDIENTS.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="search">
        <IconSearch />
        <input className="input" placeholder="Search an ingredient" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {matches.length > 0 && (
        <div className="chips">
          {matches.map((i) => (
            <Chip key={i.id} small selected={set.has(i.id)} onClick={() => toggleOne(i.id)}>
              {i.name}
            </Chip>
          ))}
        </div>
      )}
      {extras.length > 0 && (
        <div className="chips">
          {extras.map((id) => (
            <Chip key={id} small selected onClick={() => toggleOne(id)}>
              {nameOf(id)}
            </Chip>
          ))}
        </div>
      )}
      <div>
        <div className="eyebrow" style={{ margin: '0 4px 10px' }}>Common picks</div>
        <div className="chips">
          {SKIP_GROUPS.map((g) => (
            <Chip key={g.label} emoji={g.emoji} selected={groupOn(g)} onClick={() => toggleGroup(g)}>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
