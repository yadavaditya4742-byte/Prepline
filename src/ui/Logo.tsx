import markUrl from '../assets/brand/mark.svg';
import wordmark from '../assets/brand/wordmark-mono.svg?raw';

/** Prepline lockup: the p-with-happy-bowl mark + the "prepline" wordmark (letters follow the text color). */
export function Logo({ size }: { size?: 'lg' }) {
  return (
    <span className={`logo${size === 'lg' ? ' lg' : ''}`} role="img" aria-label="Prepline">
      <img className="mark" src={markUrl} alt="" />
      <span className="word" aria-hidden dangerouslySetInnerHTML={{ __html: wordmark }} />
    </span>
  );
}
