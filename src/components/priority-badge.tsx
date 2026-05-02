import type { Priority } from '@/types';

const LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority-badge ${priority}`} aria-label={`Priority: ${LABEL[priority]}`}>
      {LABEL[priority]}
    </span>
  );
}
