/**
 * Deterministic colored avatar — same name always gets the same hue.
 * Initials are 1–2 letters of the name.
 */

const PALETTE = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function colorFor(name: string): string {
  return PALETTE[hash(name) % PALETTE.length] ?? PALETTE[0]!;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)) || '?';
}

type Props = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
};

export function Avatar({ name, size = 'md', title }: Props) {
  const className = size === 'md' ? 'avatar' : `avatar ${size}`;
  return (
    <span
      className={className}
      style={{ background: colorFor(name) }}
      title={title ?? name}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
