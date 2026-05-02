import type { Presence as PresenceType } from '@/types';

type Props = {
  presence: PresenceType[];
  currentUser: string;
};

export function PresenceList({ presence, currentUser }: Props) {
  if (presence.length === 0) {
    return (
      <div className="presence" aria-label="No one else online" role="status">
        <span>No one else online yet — open this in another tab to test.</span>
      </div>
    );
  }

  return (
    <div className="presence" role="status" aria-label={`${presence.length} online`} aria-live="polite">
      <span style={{ marginRight: 4 }}>Online:</span>
      {presence.map((p) => {
        const isYou = p.name === currentUser;
        return (
          <span key={p.id} className={`presence-pill${isYou ? ' you' : ''}`}>
            {p.name}
            {isYou && <span aria-hidden="true"> (you)</span>}
            {isYou && <span className="visually-hidden"> (you)</span>}
          </span>
        );
      })}
    </div>
  );
}
