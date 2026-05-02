export type Task = {
  id: string;
  text: string;
  done: boolean;
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
  | { type: 'task:created'; task: Task }
  | { type: 'task:updated'; task: Task }
  | { type: 'task:deleted'; id: string }
  | { type: 'presence:joined'; presence: Presence }
  | { type: 'presence:left'; id: string };
