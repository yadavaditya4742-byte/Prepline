import { useMemo, useRef, useState } from 'react';
import { STORES, STORE_BY_ID } from '../data';
import { resolvePrice } from '../engine/prices';
import { parseReceiptText, type ParsedReceipt, type ReceiptLine } from '../import/receipt';
import { useApp } from '../state/store';
import type { StoreId } from '../types';
import { formatUnitPrice, money } from './format';
import { Sheet } from './kit';
import { IngredientSelect } from './RecipeEditor';

type Stage = 'pick' | 'reading' | 'review';
interface Row extends ReceiptLine {
  key: number;
  include: boolean;
}

export function ReceiptSheet({ defaultStore, onClose, onSaved }: { defaultStore: StoreId; onClose: () => void; onSaved: (msg: string, storeId: StoreId) => void }) {
  const app = useApp();
  const [stage, setStage] = useState<Stage>('pick');
  const [progress, setProgress] = useState({ p: 0, stage: '' });
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [storeId, setStoreId] = useState<StoreId>(defaultStore);
  const [rows, setRows] = useState<Row[]>([]);
  const [extra, setExtra] = useState<Row[]>([]);
  const [showExtra, setShowExtra] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ingredients = useMemo(() => Object.values(app.ingredients), [app.ingredients]);

  const review = (parsed: ParsedReceipt) => {
    if (parsed.store) setStoreId(parsed.store);
    let k = 0;
    setRows(parsed.lines.map((l) => ({ ...l, key: k++, include: true })));
    setExtra(parsed.unmatched.map((l) => ({ ...l, key: k++, include: false })));
    setStage('review');
  };

  const fromImage = async (file?: File) => {
    if (!file) return;
    setError(null);
    setStage('reading');
    try {
      const { readReceiptImage } = await import('../import/ocr');
      const ocrText = await readReceiptImage(file, (p, s) => setProgress({ p, stage: s }));
      setText(ocrText);
      review(parseReceiptText(ocrText, ingredients));
    } catch (e) {
      setError(`Couldn't read that photo (${(e as Error).message}). Try a straighter, brighter photo, or paste the text instead.`);
      setStage('pick');
    }
  };

  const setRow = (key: number, patch: Partial<Row>, list: 'rows' | 'extra') =>
    (list === 'rows' ? setRows : setExtra)((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const toSave = [...rows, ...extra].filter((r) => r.include && r.ingredientId && app.ingredients[r.ingredientId]);

  const save = async () => {
    let n = 0;
    for (const r of toSave) {
      const ing = app.ingredients[r.ingredientId!];
      if (r.kind === 'per-lb' && ing.unit !== 'g') continue; // weighed price can't apply to a counted item
      const current = resolvePrice(storeId, ing, app.priceCtx);
      const size = r.size ?? current.size;
      const label = r.label || current.label;
      await app.setPrice(storeId, ing.id, { size, price: r.price, label });
      n++;
    }
    onSaved(`Saved ${n} real prices for ${STORE_BY_ID[storeId].name}`, storeId);
  };

  const line = (r: Row, list: 'rows' | 'extra') => {
    const ing = r.ingredientId ? app.ingredients[r.ingredientId] : undefined;
    const current = ing ? resolvePrice(storeId, ing, app.priceCtx) : null;
    const size = r.size ?? current?.size ?? 0;
    const per = ing && size ? formatUnitPrice(r.price / size, ing.unit) : '';
    return (
      <div key={r.key} className={`card receipt-row${r.include ? '' : ' off'}`}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={r.include} onChange={(e) => setRow(r.key, { include: e.target.checked }, list)} aria-label="Include" style={{ width: 22, height: 22, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted small receipt-raw">{r.raw.trim()}</div>
            <div style={{ marginTop: 6 }}>
              <IngredientSelect value={r.ingredientId ?? ''} ingredients={app.ingredients} onChange={(id) => setRow(r.key, { ingredientId: id || null, include: !!id }, list)} />
            </div>
            <div className="small" style={{ marginTop: 6, fontWeight: 700 }}>
              {money(r.price)} {r.kind === 'per-lb' ? '/ lb' : r.kind === 'each' ? 'each' : r.label ? `· ${r.label}` : current ? `· same pack as before (${current.label})` : ''}
              {per && <span className="muted"> · {per}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet onClose={onClose} title="Scan a receipt" sub="Your phone reads it. Nothing is uploaded. You check every price before saving.">
      {stage === 'pick' && (
        <div className="stack" style={{ gap: 14 }}>
          {error && <div className="notice" style={{ color: 'var(--warn)' }}>{error}</div>}
          <button className="btn btn-primary" onClick={() => cameraRef.current?.click()}>📸 Take a photo of your receipt</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Choose a photo</button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => fromImage(e.target.files?.[0])} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => fromImage(e.target.files?.[0])} />
          <div className="notice">
            <span className="emoji">💡</span>
            <span>Lay the receipt flat in good light and fill the frame. Long receipts: take it in two photos.</span>
          </div>
          <details>
            <summary className="muted small" style={{ fontWeight: 700, cursor: 'pointer' }}>Or paste receipt text (e.g. from an e-receipt email)</summary>
            <textarea className="input textarea" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'GRK YOG NF 32OZ   5.29\nBNLS SKNLS CHKN BRST\n 2.43 lb @ 4.99 /lb   12.13'} style={{ marginTop: 10 }} />
            <button className="btn btn-dark" style={{ marginTop: 10, width: '100%' }} disabled={text.trim().length < 8} onClick={() => review(parseReceiptText(text, ingredients))}>
              Read this text
            </button>
          </details>
        </div>
      )}

      {stage === 'reading' && (
        <div style={{ textAlign: 'center', padding: '30px 8px' }}>
          <div style={{ fontSize: 48 }} aria-hidden>🧾</div>
          <p style={{ fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: 20, margin: '10px 0 14px' }}>{progress.stage || 'Starting…'}</p>
          <div className="build-bar"><span style={{ width: `${Math.round(progress.p * 100)}%` }} /></div>
          <p className="muted small">First scan downloads the reader (about 7 MB) once. After that it works offline.</p>
        </div>
      )}

      {stage === 'review' && (
        <div className="stack" style={{ gap: 12 }}>
          <label className="field">
            <span>Store</span>
            <select className="select" value={storeId} onChange={(e) => setStoreId(e.target.value as StoreId)}>
              {STORES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          {rows.length === 0 && <div className="notice">We couldn’t match any items. Check the lines below and pick ingredients, or try a clearer photo.</div>}
          {rows.map((r) => line(r, 'rows'))}
          {extra.length > 0 && (
            <>
              <button className="btn btn-text" onClick={() => setShowExtra(!showExtra)}>
                {showExtra ? 'Hide' : 'Show'} {extra.length} other line{extra.length === 1 ? '' : 's'} we didn’t match
              </button>
              {showExtra && extra.map((r) => line(r, 'extra'))}
            </>
          )}
          <button className="btn btn-primary" disabled={!toSave.length} onClick={save}>
            Save {toSave.length} price{toSave.length === 1 ? '' : 's'} for {STORE_BY_ID[storeId].name}
          </button>
          <button className="btn btn-text" onClick={() => setStage('pick')}>Scan another</button>
        </div>
      )}
    </Sheet>
  );
}
