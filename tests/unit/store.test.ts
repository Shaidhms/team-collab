import { describe, it, expect, beforeEach } from 'vitest';
import { Store } from '@/lib/store';
import type { StoreEvent } from '@/types';

describe('Store', () => {
  let store: Store;

  beforeEach(() => {
    store = new Store();
  });

  describe('tasks', () => {
    it('creates a task with text and creator', () => {
      const task = store.createTask({ text: 'Write tests', createdBy: 'Ada' });
      expect(task.id).toBeTruthy();
      expect(task.text).toBe('Write tests');
      expect(task.createdBy).toBe('Ada');
      expect(task.done).toBe(false);
      expect(task.createdAt).toBe(task.updatedAt);
    });

    it('lists tasks newest-first', async () => {
      const a = store.createTask({ text: 'first', createdBy: 'X' });
      await new Promise((r) => setTimeout(r, 5));
      const b = store.createTask({ text: 'second', createdBy: 'X' });
      const list = store.listTasks();
      expect(list[0]?.id).toBe(b.id);
      expect(list[1]?.id).toBe(a.id);
    });

    it('updates a task and bumps updatedAt', async () => {
      const created = store.createTask({ text: 'one', createdBy: 'X' });
      await new Promise((r) => setTimeout(r, 5));
      const updated = store.updateTask(created.id, { done: true });
      expect(updated?.done).toBe(true);
      expect(updated?.text).toBe('one');
      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    it('returns null when updating a missing task', () => {
      expect(store.updateTask('missing', { done: true })).toBeNull();
    });

    it('deletes a task and reports success', () => {
      const created = store.createTask({ text: 'gone', createdBy: 'X' });
      expect(store.deleteTask(created.id)).toBe(true);
      expect(store.getTask(created.id)).toBeNull();
    });

    it('reports failure when deleting a missing task', () => {
      expect(store.deleteTask('missing')).toBe(false);
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
    it('emits task:created to subscribers', () => {
      const events: StoreEvent[] = [];
      store.subscribe((e) => events.push(e));
      store.createTask({ text: 'x', createdBy: 'Ada' });
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('task:created');
    });

    it('emits task:updated and task:deleted', () => {
      const events: StoreEvent[] = [];
      const created = store.createTask({ text: 'x', createdBy: 'Ada' });
      store.subscribe((e) => events.push(e));
      store.updateTask(created.id, { done: true });
      store.deleteTask(created.id);
      expect(events.map((e) => e.type)).toEqual(['task:updated', 'task:deleted']);
    });

    it('emits presence:joined and presence:left', () => {
      const events: StoreEvent[] = [];
      store.subscribe((e) => events.push(e));
      store.addPresence({ id: 'p1', name: 'Ada' });
      store.removePresence('p1');
      expect(events.map((e) => e.type)).toEqual(['presence:joined', 'presence:left']);
    });

    it('unsubscribe stops events', () => {
      const events: StoreEvent[] = [];
      const off = store.subscribe((e) => events.push(e));
      store.createTask({ text: 'a', createdBy: 'X' });
      off();
      store.createTask({ text: 'b', createdBy: 'X' });
      expect(events).toHaveLength(1);
    });

    it('a throwing listener does not break others', () => {
      const events: StoreEvent[] = [];
      store.subscribe(() => {
        throw new Error('boom');
      });
      store.subscribe((e) => events.push(e));
      store.createTask({ text: 'x', createdBy: 'X' });
      expect(events).toHaveLength(1);
    });
  });
});
