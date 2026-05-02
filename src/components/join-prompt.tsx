'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';

export function JoinPrompt() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a display name to join.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Could not join — try again.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join — try again.');
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="join-heading">
      <h2 id="join-heading" style={{ fontSize: 18, marginTop: 0 }}>
        Join the workspace
      </h2>
      <p style={{ color: 'var(--fg-muted)', fontSize: 14, marginTop: 4 }}>
        Pick a display name. Everyone in this workspace sees who is online.
      </p>

      <form className="join-form" onSubmit={onSubmit} noValidate>
        <label className="visually-hidden" htmlFor={inputId}>
          Display name
        </label>
        <input
          id={inputId}
          type="text"
          autoFocus
          autoComplete="nickname"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          required
        />
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join'}
        </button>
      </form>

      {error && (
        <p id={errorId} role="alert" className="banner warn">
          {error}
        </p>
      )}
    </section>
  );
}
