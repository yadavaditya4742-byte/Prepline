import { useEffect, useState, type ReactNode } from 'react';
import { IconCheck, IconMinus, IconPlus } from './icons';

export function Chip({
  selected,
  onClick,
  emoji,
  children,
  small,
}: {
  selected?: boolean;
  onClick?: () => void;
  emoji?: string;
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <button type="button" className={`chip${small ? ' sm' : ''}`} aria-pressed={!!selected} onClick={onClick}>
      {selected ? (
        <span className="tick">
          <IconCheck />
        </span>
      ) : (
        emoji && <span className="emoji">{emoji}</span>
      )}
      {children}
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="stepper">
      <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <IconMinus />
      </button>
      <span className="num" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <IconPlus />
      </button>
    </div>
  );
}

export function Range({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <input
      className="range"
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      style={{ ['--fill' as string]: fill }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ onClose, title, sub, children }: { onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-head">
          <div className="grab" />
          <h2 className="title" style={{ fontSize: 24 }}>{title}</h2>
          {sub && <div className="muted" style={{ marginTop: 4 }}>{sub}</div>}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

/** Tiny toast hook. */
export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg ? <div className="toast" role="status">{msg}</div> : null, setMsg];
}
