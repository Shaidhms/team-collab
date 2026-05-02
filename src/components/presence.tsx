import { Avatar } from '@/components/avatar';
import type { Presence as PresenceType } from '@/types';

type Props = {
  presence: PresenceType[];
  currentUser: string;
};

export function PresenceList({ presence, currentUser }: Props) {
  // Dedupe by name on the client too — defensive guard against any stale
  // server-side entries (multiple tabs / refresh leaving a presence id behind
  // before its SSE cleanup fires).
  const seen = new Set<string>();
  const uniquePresence = presence.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  if (uniquePresence.length === 0) {
    return (
      <div className="presence" role="status">
        <span className="presence-label">Online</span>
        <span className="presence-names">
          You’re alone — open this in another browser to test multi-user updates.
        </span>
      </div>
    );
  }

  const displayed = uniquePresence.slice(0, 6);
  const overflow = uniquePresence.length - displayed.length;

  return (
    <div className="presence" role="status" aria-live="polite">
      <span className="presence-label">Online · {uniquePresence.length}</span>
      <div className="presence-stack" aria-hidden="true">
        {displayed.map((p) => (
          <Avatar key={p.id} name={p.name} title={p.name === currentUser ? `${p.name} (you)` : p.name} />
        ))}
        {overflow > 0 && (
          <span className="avatar" style={{ background: 'var(--fg-subtle)' }}>
            +{overflow}
          </span>
        )}
      </div>
      <span className="presence-names">
        {uniquePresence.map((p, idx) => (
          <span key={p.id}>
            {idx > 0 && ', '}
            {p.name === currentUser ? <strong>{p.name} (you)</strong> : p.name}
          </span>
        ))}
      </span>
    </div>
  );
}
