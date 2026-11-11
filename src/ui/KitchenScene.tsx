import type { KeyboardEvent, ReactNode } from 'react';
import type { Appliance } from '../types';

/*
 * Prepline's interactive kitchen: an original flat, front-facing illustration.
 * Each appliance is a toggle button. Selected appliances light up with a
 * saffron glow, a small animation, and a dark label with a check.
 */

interface Spot {
  id: Appliance;
  label: string;
  /** Label pill centre. */
  lx: number;
  ly: number;
  /** Glow centre and radius. */
  gx: number;
  gy: number;
  gr: number;
  /** Generous tap target. */
  hit: [x: number, y: number, w: number, h: number];
  art: (on: boolean) => ReactNode;
}

const BODY = 'var(--k-body)';
const STEEL = 'var(--k-steel)';
const GLASS = 'var(--k-glass)';
const INK = 'var(--k-ink)';
const SAFFRON = '#ffc94a';

const SPOTS: Spot[] = [
  {
    id: 'microwave',
    label: 'Microwave',
    lx: 196, ly: 21,
    gx: 196, gy: 58, gr: 64,
    hit: [140, 6, 116, 82],
    art: (on) => (
      <>
        <rect x="146" y="36" width="102" height="46" rx="8" fill={BODY} stroke={STEEL} strokeWidth="1.5" />
        <rect x="154" y="44" width="66" height="30" rx="5" fill={GLASS} />
        {on && <rect x="158" y="48" width="58" height="22" rx="4" fill={SAFFRON} opacity="0.55" className="k-pulse" />}
        <rect x="226" y="44" width="16" height="9" rx="2" fill={GLASS} />
        {on && <text x="234" y="51.5" fontSize="6" textAnchor="middle" fill={SAFFRON} fontWeight="800">1:30</text>}
        <circle cx="234" cy="61" r="2" fill={STEEL} />
        <circle cx="234" cy="68" r="2" fill={STEEL} />
      </>
    ),
  },
  {
    id: 'stovetop',
    label: 'Stovetop',
    lx: 78, ly: 120,
    gx: 78, gy: 160, gr: 62,
    hit: [22, 108, 116, 66],
    art: (on) => (
      <>
        <rect x="24" y="160" width="110" height="7" rx="2.5" fill={GLASS} />
        {on && <rect x="40" y="166" width="46" height="2" rx="1" fill="#ff7a3d" className="k-pulse" />}
        {/* pan */}
        <path d="M40 150 h46 a4 4 0 0 1 -4 9 h-38 a4 4 0 0 1 -4 -9z" fill={INK} />
        <rect x="85" y="150.5" width="34" height="4" rx="2" fill={INK} />
        <ellipse cx="63" cy="150" rx="23" ry="3.2" fill={STEEL} />
        {on && (
          <g stroke="var(--k-steam)" strokeWidth="2" strokeLinecap="round" fill="none">
            <path className="k-steam" d="M52 142 q-4 -6 0 -12 q4 -6 0 -12" />
            <path className="k-steam d2" d="M63 142 q-4 -6 0 -12 q4 -6 0 -12" />
            <path className="k-steam d3" d="M74 142 q-4 -6 0 -12 q4 -6 0 -12" />
          </g>
        )}
      </>
    ),
  },
  {
    id: 'oven',
    label: 'Oven',
    lx: 80, ly: 268,
    gx: 80, gy: 232, gr: 60,
    hit: [26, 184, 108, 98],
    art: (on) => (
      <>
        <rect x="30" y="186" width="100" height="88" rx="6" fill={BODY} stroke={STEEL} strokeWidth="1.5" />
        <rect x="30" y="186" width="100" height="14" rx="6" fill={STEEL} opacity="0.55" />
        <circle cx="44" cy="193" r="3" fill={INK} />
        <circle cx="56" cy="193" r="3" fill={INK} />
        <circle cx="116" cy="193" r="3" fill={INK} />
        <rect x="88" y="190" width="18" height="6" rx="1.5" fill={GLASS} />
        <rect x="46" y="204" width="68" height="4" rx="2" fill={STEEL} />
        <rect x="42" y="212" width="76" height="44" rx="6" fill={GLASS} />
        {on && (
          <>
            <rect x="46" y="216" width="68" height="36" rx="4" fill={SAFFRON} opacity="0.35" className="k-pulse" />
            <path d="M54 246 h52" stroke="#ff7a3d" strokeWidth="2" strokeLinecap="round" />
            <rect x="62" y="236" width="36" height="6" rx="3" fill={INK} />
          </>
        )}
      </>
    ),
  },
  {
    id: 'air-fryer',
    label: 'Air fryer',
    lx: 167, ly: 198,
    gx: 167, gy: 142, gr: 46,
    hit: [140, 110, 54, 100],
    art: (on) => (
      <>
        <rect x="146" y="116" width="42" height="48" rx="14" fill={BODY} stroke={STEEL} strokeWidth="1.5" />
        <rect x="150" y="138" width="34" height="22" rx="8" fill={STEEL} opacity="0.5" />
        <rect x="160" y="146" width="14" height="5" rx="2.5" fill={INK} />
        <circle cx="167" cy="126" r="4.5" fill={GLASS} />
        {on && <circle cx="167" cy="126" r="2.5" fill={SAFFRON} className="k-pulse" />}
      </>
    ),
  },
  {
    id: 'pressure-cooker',
    label: 'Instant Pot',
    lx: 222, ly: 222,
    gx: 222, gy: 144, gr: 46,
    hit: [196, 108, 54, 128],
    art: (on) => (
      <>
        <rect x="200" y="128" width="44" height="36" rx="8" fill={BODY} stroke={STEEL} strokeWidth="1.5" />
        <path d="M198 128 q24 -14 48 0 z" fill={STEEL} />
        <rect x="218" y="113" width="8" height="5" rx="2" fill={INK} />
        <rect x="194" y="132" width="6" height="4" rx="2" fill={INK} />
        <rect x="244" y="132" width="6" height="4" rx="2" fill={INK} />
        <rect x="211" y="140" width="22" height="12" rx="3" fill={GLASS} />
        {on && <text x="222" y="149" fontSize="7" textAnchor="middle" fill={SAFFRON} fontWeight="800" className="k-pulse">ON</text>}
        {on && (
          <path className="k-steam" d="M232 112 q-3 -5 0 -10 q3 -5 0 -10" stroke="var(--k-steam)" strokeWidth="2" strokeLinecap="round" fill="none" />
        )}
      </>
    ),
  },
  {
    id: 'blender',
    label: 'Blender',
    lx: 266, ly: 246,
    gx: 268, gy: 128, gr: 42,
    hit: [248, 86, 40, 172],
    art: (on) => (
      <>
        <rect x="248" y="91" width="40" height="7" rx="3" fill={INK} />
        <path d="M252 98 h32 l-3 48 h-26 z" fill="var(--k-jar)" stroke={STEEL} strokeWidth="1.5" />
        {on && <path className="k-fill" d="M254 124 h28 l-1.5 22 h-25 z" fill="#8bc34a" />}
        {on && <path className="k-fill" d="M254.8 132 h26.4 l-1 14 h-24.4 z" fill={SAFFRON} opacity="0.9" />}
        <rect x="254" y="146" width="28" height="18" rx="4" fill={BODY} stroke={STEEL} strokeWidth="1.5" />
        <circle cx="268" cy="155" r="3" fill={on ? SAFFRON : INK} />
      </>
    ),
  },
  {
    id: 'grill',
    label: 'Grill',
    lx: 324, ly: 172,
    gx: 324, gy: 222, gr: 46,
    hit: [296, 158, 60, 128],
    art: (on) => (
      <>
        <path d="M300 214 a24 18 0 0 1 48 0 z" fill={INK} />
        <rect x="320" y="192" width="8" height="5" rx="2" fill={STEEL} />
        <path d="M298 216 h52 a26 20 0 0 1 -52 0 z" fill={INK} />
        <rect x="298" y="213" width="52" height="4" rx="2" fill={STEEL} />
        <path d="M308 232 l-6 48 M340 232 l6 48 M324 236 v44" stroke={STEEL} strokeWidth="3" strokeLinecap="round" />
        <circle cx="346" cy="281" r="4" fill={INK} />
        {on && (
          <g stroke="var(--k-steam)" strokeWidth="2" strokeLinecap="round" fill="none">
            <path className="k-steam" d="M314 194 q-3 -5 0 -10" />
            <path className="k-steam d2" d="M334 194 q-3 -5 0 -10" />
          </g>
        )}
        {on && <rect x="302" y="212" width="44" height="2.5" rx="1" fill="#ff7a3d" className="k-pulse" />}
      </>
    ),
  },
];

function Label({ x, y, text, on }: { x: number; y: number; text: string; on: boolean }) {
  const w = text.length * 6.3 + 30;
  return (
    <g className="k-label" transform={`translate(${x - w / 2} ${y - 11})`}>
      <rect width={w} height="22" rx="11" fill={on ? 'var(--hero)' : 'var(--surface)'} stroke={on ? 'none' : 'var(--line)'} />
      <circle cx="12" cy="11" r="6.5" fill={on ? SAFFRON : 'var(--surface-2)'} />
      {on ? (
        <path d="M9 11.2 l2 2 l4 -4.2" stroke="#13322c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M12 8.2 v5.6 M9.2 11 h5.6" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round" />
      )}
      <text x="23" y="15" fontSize="10.5" fontWeight="700" fill={on ? 'var(--hero-ink)' : 'var(--ink-soft)'}>{text}</text>
    </g>
  );
}

export function KitchenScene({ value, onChange }: { value: Appliance[]; onChange: (a: Appliance[]) => void }) {
  const toggle = (id: Appliance) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const onKey = (e: KeyboardEvent, id: Appliance) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(id);
    }
  };

  return (
    <div className="kitchen">
      <svg viewBox="0 0 360 300" role="group" aria-label="Your kitchen. Tap the appliances you have.">
        <defs>
          <radialGradient id="kglow">
            <stop offset="0%" stopColor={SAFFRON} stopOpacity="0.75" />
            <stop offset="60%" stopColor={SAFFRON} stopOpacity="0.18" />
            <stop offset="100%" stopColor={SAFFRON} stopOpacity="0" />
          </radialGradient>
          <pattern id="ktile" width="18" height="12" patternUnits="userSpaceOnUse">
            <rect width="18" height="12" fill="var(--k-tile)" />
            <path d="M0 0.5 H18 M0.5 0 V12" stroke="var(--k-wall)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Room */}
        <rect width="360" height="300" rx="26" fill="var(--k-wall)" />
        <rect x="10" y="100" width="282" height="64" fill="url(#ktile)" />
        {/* Upper cabinet */}
        <rect x="18" y="16" width="112" height="72" rx="8" fill="var(--k-cab)" />
        <path d="M74 22 v60" stroke="var(--k-cab-line)" strokeWidth="1.5" />
        <rect x="64" y="62" width="3" height="14" rx="1.5" fill="var(--k-handle)" />
        <rect x="81" y="62" width="3" height="14" rx="1.5" fill="var(--k-handle)" />
        {/* Microwave shelf */}
        <rect x="138" y="82" width="120" height="6" rx="3" fill="var(--k-wood)" />
        {/* Window */}
        <rect x="270" y="18" width="72" height="62" rx="10" fill="var(--k-sky)" />
        <path d="M306 18 v62 M270 49 h72" stroke="var(--k-wall)" strokeWidth="3" />
        <circle cx="290" cy="34" r="6" fill={SAFFRON} opacity="0.85" />
        {/* Counter + base cabinets */}
        <rect x="10" y="164" width="282" height="12" rx="3" fill="var(--k-wood)" />
        <rect x="14" y="176" width="274" height="106" fill="var(--k-cab)" />
        <path d="M200 182 v94 M246 182 v94" stroke="var(--k-cab-line)" strokeWidth="1.5" />
        <rect x="192" y="196" width="3" height="16" rx="1.5" fill="var(--k-handle)" />
        <rect x="251" y="196" width="3" height="16" rx="1.5" fill="var(--k-handle)" />
        {/* Floor */}
        <rect x="0" y="282" width="360" height="18" fill="var(--k-floor)" />

        {/* Glows sit behind appliances */}
        {SPOTS.filter((s) => value.includes(s.id)).map((s) => (
          <circle key={`g-${s.id}`} cx={s.gx} cy={s.gy} r={s.gr} fill="url(#kglow)" className="k-glow" />
        ))}

        {SPOTS.map((s) => {
          const on = value.includes(s.id);
          return (
            <g
              key={s.id}
              className={`k-appl${on ? ' on' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={s.label}
              aria-pressed={on}
              onClick={() => toggle(s.id)}
              onKeyDown={(e) => onKey(e, s.id)}
            >
              <rect className="k-hit" x={s.hit[0]} y={s.hit[1]} width={s.hit[2]} height={s.hit[3]} rx="10" fill="transparent" />
              <g className="k-art">{s.art(on)}</g>
            </g>
          );
        })}

        {/* Labels on top so they never hide behind art */}
        {SPOTS.map((s) => (
          <g key={`l-${s.id}`} onClick={() => toggle(s.id)} style={{ cursor: 'pointer' }} aria-hidden>
            <Label x={s.lx} y={s.ly} text={s.label} on={value.includes(s.id)} />
          </g>
        ))}
      </svg>
      <p className="kitchen-sum">
        {value.length === 0
          ? 'Tap the appliances you have'
          : `${value.length} selected · ${SPOTS.filter((s) => value.includes(s.id)).map((s) => s.label).join(', ')}`}
      </p>
    </div>
  );
}
