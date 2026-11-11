import { useRef, useState, type ReactNode } from 'react';
import { exportBackup, importBackup } from '../db/db';
import { isoDate } from '../engine/week';
import { useApp } from '../state/store';
import type { Settings } from '../types';
import { money } from './format';
import { IconRefresh } from './icons';
import { Range, Segmented, Stepper, useToast } from './kit';
import { DaysPicker, DietPicker, KitchenPicker, PriorityPicker, SkipPicker, StorePicker } from './prefs';

function Block({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head" style={{ display: 'block' }}>
        <h2>{title}</h2>
        {sub && <div className="muted small" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const app = useApp();
  const s = app.settings;
  const [dirty, setDirty] = useState(false);
  const [toast, showToast] = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = async (patch: Partial<Settings>, affectsPlan = true) => {
    await app.updateSettings(patch);
    if (affectsPlan) setDirty(true);
  };

  const download = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prepline-backup-${isoDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup saved');
  };

  return (
    <>
      <h1 className="display">Settings</h1>
      <p className="lede">Everything here stays on this device.</p>

      {dirty && (
        <div className="card" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 12, zIndex: 5 }}>
          <span style={{ flex: 1, fontWeight: 700 }}>Apply your changes to this week?</span>
          <button
            className="btn btn-dark"
            onClick={async () => {
              await app.regenerate();
              setDirty(false);
              showToast('Week rebuilt (locked dinners kept)');
            }}
          >
            <IconRefresh /> Rebuild
          </button>
        </div>
      )}

      <Block title="Budget & people">
        <div className="card">
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="num" style={{ fontSize: 34 }}>{money(s.weeklyBudget)}</span>
            <span className="muted" style={{ fontWeight: 700 }}>per week</span>
          </div>
          <div style={{ margin: '14px 0 18px' }}>
            <Range label="Weekly budget" min={20} max={300} step={5} value={s.weeklyBudget} onChange={(weeklyBudget) => set({ weeklyBudget })} />
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <b>Cooking for</b>
              <div className="muted small">{s.servings === 1 ? 'Just me' : `${s.servings} people`}</div>
            </div>
            <Stepper label="people" value={s.servings} min={1} max={8} onChange={(servings) => set({ servings })} />
          </div>
        </div>
      </Block>

      <Block title="Store" sub="Prices and pack sizes follow this store.">
        <StorePicker value={s.storeId} onChange={(storeId) => set({ storeId })} />
      </Block>

      <Block title="Diet">
        <DietPicker value={s.diet} onChange={(diet) => set({ diet })} />
      </Block>

      <Block title="Planning priority">
        <PriorityPicker value={s.priority} onChange={(priority) => set({ priority })} />
      </Block>

      <Block title="Cooking nights">
        <DaysPicker value={s.cookDays} onChange={(cookDays) => cookDays.length && set({ cookDays })} />
      </Block>

      <Block title="Kitchen">
        <KitchenPicker value={s.appliances} onChange={(appliances) => appliances.length && set({ appliances })} />
      </Block>

      <Block title="Skip these" sub="Dinners containing these never get planned.">
        <SkipPicker value={s.excludes} onChange={(excludes) => set({ excludes })} />
      </Block>

      <Block title="Appearance">
        <Segmented
          value={s.theme}
          onChange={(theme) => set({ theme }, false)}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Block>

      <Block title="Your data" sub="No account, no server. Back up to move to a new phone.">
        <div className="card stack">
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-dark" style={{ flex: 1 }} onClick={download}>Export backup</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>Import backup</button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (!confirm('Replace everything on this device with this backup?')) return;
              try {
                await importBackup(JSON.parse(await f.text()));
                await app.reload();
                showToast('Backup restored');
              } catch (x) {
                showToast(x instanceof Error ? x.message : 'Could not read that file');
              }
            }}
          />
          <button className="btn btn-text" onClick={() => set({ onboarded: false }, false)}>
            Walk through setup again
          </button>
        </div>
      </Block>

      <Block title="About the numbers">
        <div className="notice">
          <span className="emoji">ℹ️</span>
          <span>
            Nutrition figures are estimates from typical ingredient values. Prices are estimates unless marked
            <b> Live</b> (Kroger family, from Kroger’s public product API) or <b>Edited</b> (your own number).
          </span>
        </div>
      </Block>
      {toast}
    </>
  );
}
