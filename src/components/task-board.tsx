'use client';

import { useEffect, useMemo, useReducer, useState, useId, useRef } from 'react';
import type { Task, Presence, StoreEvent, Priority } from '@/types';
import { PRIORITIES } from '@/types';
import { PresenceList } from '@/components/presence';
import { PriorityBadge } from '@/components/priority-badge';
import { FilterChips, type Filter } from '@/components/filter-chips';
import { Stats } from '@/components/stats';
import { Toaster, useToasts } from '@/components/toaster';
import { Avatar } from '@/components/avatar';

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
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const priorityId = useId();
  const errorId = useId();
  const { toasts, push: pushToast, dismiss } = useToasts();

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

        // Toast peers' actions only — never your own.
        if (event.type === 'task:created' && event.by !== currentUser) {
          pushToast(event.by, `added "${truncate(event.task.text, 40)}"`);
        } else if (event.type === 'task:updated' && event.by !== currentUser) {
          pushToast(event.by, `updated "${truncate(event.task.text, 40)}"`);
        } else if (event.type === 'task:deleted' && event.by !== currentUser) {
          pushToast(event.by, `deleted a task`);
        } else if (event.type === 'presence:joined' && event.presence.name !== currentUser) {
          pushToast(event.presence.name, 'joined the workspace');
        }
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
  }, [currentUser, pushToast]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, priority }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to add task');
      }
      setPriority('medium');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task');
      setText(trimmed);
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

  const counts = useMemo(() => {
    const all = state.tasks.length;
    const done = state.tasks.filter((t) => t.done).length;
    const active = all - done;
    return { all, active, done };
  }, [state.tasks]);

  const highPriority = useMemo(
    () => state.tasks.filter((t) => t.priority === 'high' && !t.done).length,
    [state.tasks],
  );

  const visibleTasks = useMemo(() => {
    if (filter === 'active') return state.tasks.filter((t) => !t.done);
    if (filter === 'done') return state.tasks.filter((t) => t.done);
    return state.tasks;
  }, [state.tasks, filter]);

  return (
    <section aria-labelledby="board-heading">
      <h2 id="board-heading" className="visually-hidden">
        Shared task board
      </h2>

      <Stats
        totalTasks={counts.all}
        doneTasks={counts.done}
        online={state.presence.length}
        highPriority={highPriority}
      />

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
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs doing?"
          maxLength={280}
          autoComplete="off"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
        />
        <label className="visually-hidden" htmlFor={priorityId}>
          Priority
        </label>
        <select
          id={priorityId}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p[0]!.toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <button type="submit" className="primary" disabled={!text.trim()}>
          Add task
        </button>
      </form>

      {error && (
        <p id={errorId} role="alert" className="banner warn">
          {error}
        </p>
      )}

      <div className="toolbar">
        <FilterChips value={filter} onChange={setFilter} counts={counts} />
      </div>

      <ul className="task-list" aria-live="polite" aria-relevant="additions removals">
        {visibleTasks.map((task) => (
          <li key={task.id} className={`task${task.done ? ' done' : ''}`}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => handleToggle(task)}
              aria-label={`Mark "${task.text}" as ${task.done ? 'not done' : 'done'}`}
            />
            <span className="task-text">{task.text}</span>
            <PriorityBadge priority={task.priority} />
            <span className="task-meta">
              <Avatar name={task.createdBy} size="sm" />
              <span>{task.createdBy}</span>
            </span>
            <button
              type="button"
              className="icon"
              onClick={() => handleDelete(task.id)}
              aria-label={`Delete "${task.text}"`}
              title="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {visibleTasks.length === 0 && (
        <div className="empty">
          <svg
            className="empty-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          {state.tasks.length === 0 ? (
            <p>No tasks yet — add the first one above.</p>
          ) : (
            <p>Nothing in this filter. Try another tab.</p>
          )}
        </div>
      )}

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}
