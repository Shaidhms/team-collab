export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Task = {
  id: string;
  text: string;
  done: boolean;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type Presence = {
  id: string;
  name: string;
  joinedAt: string;
};

export type StoreEvent =
  | { type: 'snapshot'; tasks: Task[]; presence: Presence[] }
  | { type: 'task:created'; task: Task; by: string }
  | { type: 'task:updated'; task: Task; by: string }
  | { type: 'task:deleted'; id: string; by: string }
  | { type: 'presence:joined'; presence: Presence }
  | { type: 'presence:left'; id: string };
