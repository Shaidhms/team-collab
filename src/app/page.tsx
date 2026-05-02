'use client';

import { useEffect, useState } from 'react';

type Task = { id: string; text: string; done: boolean };

const STORAGE_KEY = 'team-collab.tasks.v1';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setTasks(JSON.parse(raw));
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, loaded]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setTasks([{ id: crypto.randomUUID(), text, done: false }, ...tasks]);
    setInput('');
  };

  const toggle = (id: string) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const remove = (id: string) => setTasks(tasks.filter((t) => t.id !== id));

  return (
    <main>
      <h1>Team Collab</h1>
      <p className="muted">Warmup task list. Local-only for now.</p>

      <form onSubmit={add}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task..."
          aria-label="New task"
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {tasks.map((t) => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id)}
              aria-label={`Mark ${t.text} as ${t.done ? 'not done' : 'done'}`}
              style={{ flex: 'none', width: 'auto' }}
            />
            <span>{t.text}</span>
            <button className="ghost" onClick={() => remove(t.id)} aria-label="Remove task">
              ×
            </button>
          </li>
        ))}
        {tasks.length === 0 && loaded && <p className="muted">No tasks yet.</p>}
      </ul>
    </main>
  );
}
