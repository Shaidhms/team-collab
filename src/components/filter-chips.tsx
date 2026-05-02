'use client';

export type Filter = 'all' | 'active' | 'done';

type Props = {
  value: Filter;
  onChange: (next: Filter) => void;
  counts: Record<Filter, number>;
};

const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
];

export function FilterChips({ value, onChange, counts }: Props) {
  return (
    <div className="filters" role="group" aria-label="Filter tasks">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="chip"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          <span className="chip-count" aria-hidden="true">
            {counts[opt.value]}
          </span>
          <span className="visually-hidden"> ({counts[opt.value]} tasks)</span>
        </button>
      ))}
    </div>
  );
}
