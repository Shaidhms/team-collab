import type { Task, Presence, StoreEvent } from '@/types';

type Listener = (event: StoreEvent) => void;

class Store {
  private tasks = new Map<string, Task>();
  private presenceMap = new Map<string, Presence>();
  private listeners = new Set<Listener>();

  // ----- Tasks -----

  listTasks(): Task[] {
    return Array.from(this.tasks.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  getTask(id: string): Task | null {
    return this.tasks.get(id) ?? null;
  }

  createTask(input: { text: string; createdBy: string }): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: cryptoId(),
      text: input.text,
      done: false,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };
    this.tasks.set(task.id, task);
    this.emit({ type: 'task:created', task });
    return task;
  }

  updateTask(id: string, patch: Partial<Pick<Task, 'text' | 'done'>>): Task | null {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated: Task = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    this.emit({ type: 'task:updated', task: updated });
    return updated;
  }

  deleteTask(id: string): boolean {
    const ok = this.tasks.delete(id);
    if (ok) this.emit({ type: 'task:deleted', id });
    return ok;
  }

  // ----- Presence -----

  listPresence(): Presence[] {
    return Array.from(this.presenceMap.values()).sort((a, b) =>
      a.joinedAt.localeCompare(b.joinedAt),
    );
  }

  addPresence(input: { id: string; name: string }): Presence {
    const presence: Presence = {
      id: input.id,
      name: input.name,
      joinedAt: new Date().toISOString(),
    };
    this.presenceMap.set(presence.id, presence);
    this.emit({ type: 'presence:joined', presence });
    return presence;
  }

  removePresence(id: string): boolean {
    const ok = this.presenceMap.delete(id);
    if (ok) this.emit({ type: 'presence:left', id });
    return ok;
  }

  // ----- Subscriptions -----

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ----- Test helpers -----

  reset(): void {
    this.tasks.clear();
    this.presenceMap.clear();
    this.listeners.clear();
  }

  private emit(event: StoreEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must not break other subscribers.
      }
    }
  }
}

function cryptoId(): string {
  // Crypto.randomUUID is available in Node 19+ and modern browsers.
  return globalThis.crypto.randomUUID();
}

// Module-scope singleton — shared across all requests on a single Cloud Run
// instance. For multi-instance scale, swap with Firestore or Redis.
export const store = new Store();
export { Store };
