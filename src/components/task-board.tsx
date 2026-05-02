'use client';

import { useEffect, useReducer, useState, useId, useRef } from 'react';
import type { Task, Presence, StoreEvent } from '@/types';
import { PresenceList } from '@/components/presence';

type State = {
  tasks: Task[];
  presence: Presence[];
};

type Action =
  | { kind: 'reset'; tasks: Task[]; presence: Presence[] }
  | { kind: 'event'; event: StoreEvent };

function reducer(state: State, action: Action): State {
  if (action.kind === 'reset') {
    return { tasks: action.tasks, presence: action.presence };
  }

  const { event } = action;
  switch (event.type) {
    case 'snapshot':
      return { tasks: event.tasks, presence: event.presence };

    case 'task:created': {
      if (state.tasks.some((t) => t.id === event.task.id)) return state;
      return { ...state, tasks: [event.task, ...state.tasks] };
    }

    case 'task:updated':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === event.task.id ? event.task : t)),
      };

    case 'task:deleted':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== event.id) };

    case 'presence:joined': {
      if (state.presence.some((p) => p.id === event.presence.id)) return state;
      return { ...state, presence: [...state.presence, event.presence] };
    }

    case 'presence:left':
      return { ...state, presence: state.presence.filter((p) => p.id !== event.id) };

    default:
      return state;
  }
}

type Props = {
  initialTasks: Task[];
  initialPresence: Presence[];
  currentUser: string;
};

export function TaskBoard({ initialTasks, initialPresence, currentUser }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    tasks: initialTasks,
    presence: initialPresence,
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    const es = new EventSource('/api/stream');

    const onSnapshot = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { tasks: Task[]; presence: Presence[] };
        dispatch({ kind: 'reset', tasks: data.tasks, presence: data.presence });
        setConnected(true);
      } catch {
        // ignore malformed
      }
    };

    const onChange = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as StoreEvent;
        dispatch({ kind: 'event', event });
      } catch {
        // ignore malformed
      }
    };

    const onError = () => setConnected(false);

    es.addEventListener('snapshot', onSnapshot);
    es.addEventListener('change', onChange);
    es.addEventListener('error', onError);

    return () => {
      es.close();
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to add task');
      }
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task');
      setInput(text);
    }
  };

  const handleToggle = async (task: Task) => {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !task.done }),
      });
      if (!res.ok) throw new Error('Failed to update task');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  return (
    <section aria-labelledby="board-heading">
      <h2 id="board-heading" className="visually-hidden">
        Shared task board
      </h2>

      <PresenceList presence={state.presence} currentUser={currentUser} />

      {!connected && (
        <p className="banner info" role="status" aria-live="polite">
          Connecting to the live stream…
        </p>
      )}

      <form className="task-input" onSubmit={handleAdd} noValidate>
        <label className="visually-hidden" htmlFor={inputId}>
          New task
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What needs doing?"
          maxLength={280}
          autoComplete="off"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" className="primary" disabled={!input.trim()}>
          Add task
        </button>
      </form>

      {error && (
        <p id={errorId} role="alert" className="banner warn">
          {error}
        </p>
      )}

      <ul className="task-list" aria-live="polite" aria-relevant="additions removals">
        {state.tasks.map((task) => (
          <li key={task.id} className={`task${task.done ? ' done' : ''}`}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => handleToggle(task)}
              aria-label={`Mark "${task.text}" as ${task.done ? 'not done' : 'done'}`}
            />
            <span className="task-text">{task.text}</span>
            <span className="task-meta">by {task.createdBy}</span>
            <button
              type="button"
              className="ghost"
              onClick={() => handleDelete(task.id)}
              aria-label={`Delete "${task.text}"`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {state.tasks.length === 0 && (
        <p className="empty">No tasks yet — add the first one.</p>
      )}
    </section>
  );
}
