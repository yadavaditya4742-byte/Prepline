import { useState } from 'react';
import { regionForZip } from '../engine/region';
import { sendFeedback, type FeedbackKind } from '../state/feedback';
import { useApp } from '../state/store';
import { Chip, Sheet } from './kit';

const KINDS: { id: FeedbackKind; emoji: string; label: string }[] = [
  { id: 'idea', emoji: '💡', label: 'Idea' },
  { id: 'bug', emoji: '🐞', label: 'Something broke' },
  { id: 'price', emoji: '🏷️', label: 'Wrong price' },
  { id: 'recipe', emoji: '🍲', label: 'Recipe' },
  { id: 'love', emoji: '💚', label: 'Love it' },
  { id: 'other', emoji: '💬', label: 'Other' },
];
const FACES = ['😣', '😕', '😐', '🙂', '🤩'];

const PLACEHOLDER: Record<FeedbackKind, string> = {
  idea: 'What would make Prepline better for you?',
  bug: 'What happened, and what did you expect?',
  price: 'Which item, which store, and what did you actually pay?',
  recipe: 'Which recipe? Too long, too bland, wrong amounts…',
  love: 'What’s working for you?',
  other: 'Tell us anything.',
};

export function FeedbackSheet({ onClose, onSent, screen = 'settings' }: { onClose: () => void; onSent: (msg: string) => void; screen?: string }) {
  const app = useApp();
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [rating, setRating] = useState<number | undefined>();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [withInfo, setWithInfo] = useState(true);
  const [busy, setBusy] = useState(false);

  const s = app.settings;
  const info: Record<string, string> = {
    app: `web ${__APP_BUILD__}`,
    store: s.storeId,
    region: regionForZip(s.zip) ?? '',
    diet: s.diet,
    screen,
    device: navigator.userAgent.slice(0, 160),
  };

  const submit = async () => {
    setBusy(true);
    const r = await sendFeedback(
      { kind, message: message.trim(), rating, contact: contact.trim() || undefined, context: withInfo ? info : { app: info.app } },
      s.pricesApi,
    );
    setBusy(false);
    onSent(r === 'sent' ? 'Thanks! Feedback sent 💚' : 'Saved. It’ll send when you’re back online');
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Send feedback" sub="Prepline is in beta. Every note gets read.">
      <div className="stack" style={{ gap: 18 }}>
        <div>
          <div className="field-label">How’s Prepline working for you?</div>
          <div className="faces" role="radiogroup" aria-label="Rating">
            {FACES.map((f, i) => (
              <button key={f} type="button" role="radio" aria-checked={rating === i + 1} aria-label={`${i + 1} of 5`} className={`face${rating === i + 1 ? ' on' : ''}`} onClick={() => setRating(rating === i + 1 ? undefined : i + 1)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="field-label">About</div>
          <div className="chips">
            {KINDS.map((k) => (
              <Chip key={k.id} small emoji={k.emoji} selected={kind === k.id} onClick={() => setKind(k.id)}>
                {k.label}
              </Chip>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Your note</span>
          <textarea className="input textarea" maxLength={2000} placeholder={PLACEHOLDER[kind]} value={message} onChange={(e) => setMessage(e.target.value)} autoFocus />
        </label>

        <label className="field">
          <span>Email or name, if you’d like a reply (optional)</span>
          <input className="input" maxLength={120} autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>

        <label className="row" style={{ gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" checked={withInfo} onChange={(e) => setWithInfo(e.target.checked)} style={{ marginTop: 3 }} />
          <span className="muted small">
            Include app info to help fix things: store ({s.storeId}), region{info.region ? ` (${info.region})` : ''}, diet, screen and phone type.
            Never your ZIP, recipes or prices.
          </span>
        </label>

        <button className="btn btn-primary" disabled={busy || message.trim().length < 3} onClick={submit}>
          {busy ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </Sheet>
  );
}
