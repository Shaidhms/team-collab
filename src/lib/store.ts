import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from '@/lib/firebase-admin';
import type { Task, Presence, StoreEvent, Priority } from '@/types';

type Listener = (event: StoreEvent) => void;

export interface TaskStore {
  // Tasks (async — backend may be remote).
  listTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(input: {
    text: string;
    createdBy: string;
    priority?: Priority;
  }): Promise<Task>;
  updateTask(
    id: string,
    patch: Partial<Pick<Task, 'text' | 'done' | 'priority'>>,
    by: string,
  ): Promise<Task | null>;
  deleteTask(id: string, by: string): Promise<boolean>;

  // Presence (in-memory per instance — sync).
  listPresence(): Presence[];
  addPresence(input: { id: string; name: string }): Presence;
  removePresence(id: string): boolean;

  // Subscriptions.
  subscribe(listener: Listener): () => void;

  // Test helper — clears local state.
  reset(): void;
}

export class MemoryStore implements TaskStore {
  private tasks = new Map<string, Task>();
  private presenceMap = new Map<string, Presence>();
  private listeners = new Set<Listener>();

  // ----- Tasks -----

  async listTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getTask(id: string): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async createTask(input: {
    text: string;
    createdBy: string;
    priority?: Priority;
  }): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: cryptoId(),
      text: input.text,
      done: false,
      priority: input.priority ?? 'medium',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };
    this.tasks.set(task.id, task);
    this.emit({ type: 'task:created', task, by: input.createdBy });
    return task;
  }

  async updateTask(
    id: string,
    patch: Partial<Pick<Task, 'text' | 'done' | 'priority'>>,
    by: string,
  ): Promise<Task | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated: Task = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(id, updated);
    this.emit({ type: 'task:updated', task: updated, by });
    return updated;
  }

  async deleteTask(id: string, by: string): Promise<boolean> {
    const ok = this.tasks.delete(id);
    if (ok) this.emit({ type: 'task:deleted', id, by });
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
    return () => {
      this.listeners.delete(listener);
    };
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

type FirestoreTaskDoc = {
  text: string;
  done: boolean;
  priority: Priority;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export class FirestoreStore implements TaskStore {
  private db: Firestore;
  private collectionName = 'tasks';
  private presenceMap = new Map<string, Presence>();
  private listeners = new Set<Listener>();
  private snapshotUnsubscribe: (() => void) | null = null;
  private isInitialSnapshot = true;

  constructor(db: Firestore) {
    this.db = db;
  }

  private collection() {
    return this.db.collection(this.collectionName);
  }

  private docToTask(
    id: string,
    data: FirestoreTaskDoc | undefined,
  ): Task | null {
    if (!data) return null;
    return {
      id,
      text: data.text,
      done: data.done,
      priority: data.priority,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
    };
  }

  // ----- Tasks -----

  async listTasks(): Promise<Task[]> {
    const snap = await this.collection().orderBy('createdAt', 'desc').get();
    const out: Task[] = [];
    for (const doc of snap.docs) {
      const t = this.docToTask(doc.id, doc.data() as FirestoreTaskDoc);
      if (t) out.push(t);
    }
    return out;
  }

  async getTask(id: string): Promise<Task | null> {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) return null;
    return this.docToTask(doc.id, doc.data() as FirestoreTaskDoc | undefined);
  }

  async createTask(input: {
    text: string;
    createdBy: string;
    priority?: Priority;
  }): Promise<Task> {
    const now = new Date().toISOString();
    const data: FirestoreTaskDoc = {
      text: input.text,
      done: false,
      priority: input.priority ?? 'medium',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };
    const ref = await this.collection().add(data);
    return {
      id: ref.id,
      ...data,
    };
  }

  async updateTask(
    id: string,
    patch: Partial<Pick<Task, 'text' | 'done' | 'priority'>>,
    _by: string,
  ): Promise<Task | null> {
    const ref = this.collection().doc(id);
    const existing = await ref.get();
    if (!existing.exists) return null;
    const update = {
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.update(update);
    const fresh = await ref.get();
    return this.docToTask(fresh.id, fresh.data() as FirestoreTaskDoc | undefined);
  }

  async deleteTask(id: string, _by: string): Promise<boolean> {
    const ref = this.collection().doc(id);
    const existing = await ref.get();
    if (!existing.exists) return false;
    await ref.delete();
    return true;
  }

  // ----- Presence (in-memory per instance) -----

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
    this.ensureSnapshotListener();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private ensureSnapshotListener(): void {
    if (this.snapshotUnsubscribe) return;
    this.isInitialSnapshot = true;
    this.snapshotUnsubscribe = this.collection()
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          if (this.isInitialSnapshot) {
            // Skip replaying all existing tasks as `task:created` events.
            this.isInitialSnapshot = false;
            return;
          }
          for (const change of snapshot.docChanges()) {
            const id = change.doc.id;
            const data = change.doc.data() as FirestoreTaskDoc | undefined;
            if (change.type === 'added') {
              const task = this.docToTask(id, data);
              if (task) {
                this.emit({
                  type: 'task:created',
                  task,
                  by: task.createdBy,
                });
              }
            } else if (change.type === 'modified') {
              const task = this.docToTask(id, data);
              if (task) {
                // For updates we don't know the actor here; fall back to
                // the original creator. The HTTP route emits its own
                // explicit `task:updated` via the in-process layer when
                // available.
                this.emit({
                  type: 'task:updated',
                  task,
                  by: task.createdBy,
                });
              }
            } else if (change.type === 'removed') {
              const by = data?.createdBy ?? '';
              this.emit({ type: 'task:deleted', id, by });
            }
          }
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.warn(
            `[FirestoreStore] onSnapshot error: ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      );
  }

  reset(): void {
    this.presenceMap.clear();
    this.listeners.clear();
    if (this.snapshotUnsubscribe) {
      this.snapshotUnsubscribe();
      this.snapshotUnsubscribe = null;
    }
    this.isInitialSnapshot = true;
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
  return globalThis.crypto.randomUUID();
}

function pickStore(): TaskStore {
  if (process.env.STORE_BACKEND === 'memory') {
    return new MemoryStore();
  }
  const db = getFirestore();
  if (db) {
    return new FirestoreStore(db);
  }
  // eslint-disable-next-line no-console
  console.warn(
    '[store] Firestore unavailable — falling back to in-memory store. ' +
      'Set STORE_BACKEND=memory to silence, or run `gcloud auth application-default login` locally.',
  );
  return new MemoryStore();
}

// Module-scope singleton — shared across all requests on a single Cloud Run
// instance. Backend choice is locked at module load.
export const store: TaskStore = pickStore();
