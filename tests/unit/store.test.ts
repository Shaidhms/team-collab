import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '@/lib/store';
import type { StoreEvent } from '@/types';

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  describe('tasks', () => {
    it('creates a task with text, creator, and default medium priority', async () => {
      const task = await store.createTask({ text: 'Write tests', createdBy: 'Ada' });
      expect(task.id).toBeTruthy();
      expect(task.text).toBe('Write tests');
      expect(task.createdBy).toBe('Ada');
      expect(task.done).toBe(false);
      expect(task.priority).toBe('medium');
      expect(task.createdAt).toBe(task.updatedAt);
    });

    it('honours an explicit priority on create', async () => {
      const task = await store.createTask({
        text: 'urgent',
        createdBy: 'Ada',
        priority: 'high',
      });
      expect(task.priority).toBe('high');
    });

    it('lists tasks newest-first', async () => {
      const a = await store.createTask({ text: 'first', createdBy: 'X' });
      await new Promise((r) => setTimeout(r, 5));
      const b = await store.createTask({ text: 'second', createdBy: 'X' });
      const list = await store.listTasks();
      expect(list[0]?.id).toBe(b.id);
      expect(list[1]?.id).toBe(a.id);
    });

    it('getTask returns the task by id and null when missing', async () => {
      const created = await store.createTask({ text: 'hi', createdBy: 'X' });
      const fetched = await store.getTask(created.id);
      expect(fetched?.id).toBe(created.id);
      expect(await store.getTask('nope')).toBeNull();
    });

    it('updates text and bumps updatedAt', async () => {
      const created = await store.createTask({ text: 'one', createdBy: 'X' });
      await new Promise((r) => setTimeout(r, 5));
      const updated = await store.updateTask(created.id, { text: 'one!' }, 'X');
      expect(updated?.text).toBe('one!');
      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    it('updates done flag', async () => {
      const created = await store.createTask({ text: 'one', createdBy: 'X' });
      const updated = await store.updateTask(created.id, { done: true }, 'X');
      expect(updated?.done).toBe(true);
      expect(updated?.text).toBe('one');
    });

    it('updates priority', async () => {
      const created = await store.createTask({ text: 'one', createdBy: 'X' });
      const updated = await store.updateTask(
        created.id,
        { priority: 'high' },
        'X',
      );
      expect(updated?.priority).toBe('high');
    });

    it('returns null when updating a missing task', async () => {
      expect(await store.updateTask('missing', { done: true }, 'X')).toBeNull();
    });

    it('deletes a task and reports success', async () => {
      const created = await store.createTask({ text: 'gone', createdBy: 'X' });
      expect(await store.deleteTask(created.id, 'X')).toBe(true);
      expect(await store.getTask(created.id)).toBeNull();
    });

    it('reports failure when deleting a missing task', async () => {
      expect(await store.deleteTask('missing', 'X')).toBe(false);
    });
  });

  describe('presence', () => {
    it('adds and removes presence', () => {
      store.addPresence({ id: 'p1', name: 'Ada' });
      store.addPresence({ id: 'p2', name: 'Ben' });
      expect(store.listPresence()).toHaveLength(2);
      expect(store.removePresence('p1')).toBe(true);
      expect(store.listPresence()).toHaveLength(1);
      expect(store.removePresence('missing')).toBe(false);
    });
  });

  describe('subscriptions', () => {
    it('emits task:created with the actor', async () => {
      const events: StoreEvent[] = [];
      store.subscribe((e) => events.push(e));
      await store.createTask({ text: 'x', createdBy: 'Ada' });
      expect(events).toHaveLength(1);
      const first = events[0];
      expect(first?.type).toBe('task:created');
      if (first?.type === 'task:created') {
        expect(first.by).toBe('Ada');
      }
    });

    it('emits task:updated and task:deleted with actors', async () => {
      const events: StoreEvent[] = [];
      const created = await store.createTask({ text: 'x', createdBy: 'Ada' });
      store.subscribe((e) => events.push(e));
      await store.updateTask(created.id, { done: true }, 'Ben');
      await store.deleteTask(created.id, 'Ben');
      expect(events.map((e) => e.type)).toEqual([
        'task:updated',
        'task:deleted',
      ]);
      const updated = events[0];
      const deleted = events[1];
      if (updated?.type === 'task:updated') {
        expect(updated.by).toBe('Ben');
      }
      if (deleted?.type === 'task:deleted') {
        expect(deleted.by).toBe('Ben');
      }
    });

    it('emits presence:joined and presence:left', () => {
      const events: StoreEvent[] = [];
      store.subscribe((e) => events.push(e));
      store.addPresence({ id: 'p1', name: 'Ada' });
      store.removePresence('p1');
      expect(events.map((e) => e.type)).toEqual([
        'presence:joined',
        'presence:left',
      ]);
    });

    it('unsubscribe stops events', async () => {
      const events: StoreEvent[] = [];
      const off = store.subscribe((e) => events.push(e));
      await store.createTask({ text: 'a', createdBy: 'X' });
      off();
      await store.createTask({ text: 'b', createdBy: 'X' });
      expect(events).toHaveLength(1);
    });

    it('a throwing listener does not break others', async () => {
      const events: StoreEvent[] = [];
      store.subscribe(() => {
        throw new Error('boom');
      });
      store.subscribe((e) => events.push(e));
      await store.createTask({ text: 'x', createdBy: 'X' });
      expect(events).toHaveLength(1);
    });

    it('reset clears tasks, presence, and listeners', async () => {
      const events: StoreEvent[] = [];
      store.subscribe((e) => events.push(e));
      await store.createTask({ text: 'a', createdBy: 'X' });
      store.addPresence({ id: 'p1', name: 'Ada' });
      store.reset();
      expect(await store.listTasks()).toHaveLength(0);
      expect(store.listPresence()).toHaveLength(0);
      const beforeReset = events.length;
      await store.createTask({ text: 'b', createdBy: 'X' });
      // Listeners are also cleared by reset, so no new events.
      expect(events.length).toBe(beforeReset);
    });
  });
});
