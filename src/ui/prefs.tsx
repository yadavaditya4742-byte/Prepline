import { useMemo, useState } from 'react';
import { INGREDIENTS, STORES } from '../data';
import { DIET_LABELS } from '../engine/diet';
import { DAY_SHORT } from '../engine/week';
import type { Appliance, DietPreset, Priority, StoreId } from '../types';
import { IconCheck, IconSearch } from './icons';
import { Chip } from './kit';

// ── Store ─────────────────────────────────────────────────────
const STORE_STYLE: Record<StoreId, { mono: string; color: string; tag?: string }> = {
  kroger: { mono: 'K', color: '#2f5d9e', tag: 'Live-ready' },
  walmart: { mono: 'W', color: '#3a7bd5' },
  costco: { mono: 'C', color: '#b33a3a', tag: 'Bulk' },
  target: { mono: 'T', color: '#c2453d' },
  aldi: { mono: 'A', color: '#24427a' },
  traderjoes: { mono: 'TJ', color: '#b8452f' },
  wholefoods: { mono: 'WF', color: '#2f6b4f' },
  safeway: { mono: 'S', color: '#a8433a' },
  publix: { mono: 'P', color: '#3c7d3e' },
  heb: { mono: 'H', color: '#c23b32' },
  desi: { mono: 'अ', color: '#c27a12', tag: 'Desi staples' },
};

export function StorePicker({ value, onChange }: { value: StoreId; onChange: (s: StoreId) => void }) {
  return (
    <div className="store-grid">
      {STORES.map((s) => {
        const st = STORE_STYLE[s.id];
        return (
          <button key={s.id} type="button" className="store-card" aria-pressed={value === s.id} onClick={() => onChange(s.id)}>
            <span className="mono" style={{ background: st.color }} aria-hidden>{st.mono}</span>
            {st.tag && <span className={`tag${s.liveCapable ? ' live' : ''}`}>{st.tag}</span>}
            <span>
              <span className="name">{s.name}</span>
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

// ── Diet ──────────────────────────────────────────────────────
const DIET_EMOJI: Record<DietPreset, string> = {
  vegan: '🌱',
  vegetarian: '🥕',
  eggetarian: '🥚',
  pescatarian: '🐟',
  'chicken-fish': '🍗',
  everything: '🥩',
};
const DIET_ORDER: DietPreset[] = ['vegan', 'vegetarian', 'eggetarian', 'pescatarian', 'chicken-fish', 'everything'];

export function DietPicker({ value, onChange }: { value: DietPreset; onChange: (d: DietPreset) => void }) {
  return (
    <div className="chips">
      {DIET_ORDER.map((d) => (
        <Chip key={d} emoji={DIET_EMOJI[d]} selected={value === d} onClick={() => onChange(d)}>
          {DIET_LABELS[d]}
        </Chip>
      ))}
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
  const toggle = (id: Appliance) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="chips">
      {APPLIANCES.map((a) => (
        <Chip key={a.id} emoji={a.emoji} selected={value.includes(a.id)} onClick={() => toggle(a.id)}>
          {a.label}
        </Chip>
      ))}
    </div>
  );
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
