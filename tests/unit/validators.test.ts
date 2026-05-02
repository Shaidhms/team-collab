import { describe, it, expect } from 'vitest';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  SetSessionSchema,
  DisplayNameSchema,
  TaskTextSchema,
} from '@/lib/validators';

describe('TaskTextSchema', () => {
  it('accepts a normal string and trims', () => {
    expect(TaskTextSchema.parse('  hello  ')).toBe('hello');
  });

  it('rejects empty after trim', () => {
    expect(TaskTextSchema.safeParse('   ').success).toBe(false);
  });

  it('rejects 281 characters', () => {
    const long = 'x'.repeat(281);
    expect(TaskTextSchema.safeParse(long).success).toBe(false);
  });

  it('accepts exactly 280 characters', () => {
    const ok = 'x'.repeat(280);
    expect(TaskTextSchema.safeParse(ok).success).toBe(true);
  });
});

describe('CreateTaskSchema', () => {
  it('parses valid input', () => {
    const result = CreateTaskSchema.safeParse({ text: 'hello' });
    expect(result.success).toBe(true);
  });

  it('rejects missing text', () => {
    const result = CreateTaskSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('UpdateTaskSchema', () => {
  it('accepts partial done', () => {
    expect(UpdateTaskSchema.safeParse({ done: true }).success).toBe(true);
  });

  it('accepts partial text', () => {
    expect(UpdateTaskSchema.safeParse({ text: 'new' }).success).toBe(true);
  });

  it('rejects empty object', () => {
    expect(UpdateTaskSchema.safeParse({}).success).toBe(false);
  });
});

describe('DisplayNameSchema', () => {
  it('accepts unicode names', () => {
    expect(DisplayNameSchema.safeParse('María García').success).toBe(true);
    expect(DisplayNameSchema.safeParse('王小明').success).toBe(true);
    expect(DisplayNameSchema.safeParse("Ada O'Brien").success).toBe(true);
  });

  it('rejects names with HTML/script characters', () => {
    expect(DisplayNameSchema.safeParse('<script>').success).toBe(false);
    expect(DisplayNameSchema.safeParse('a&b').success).toBe(false);
  });

  it('rejects empty after trim', () => {
    expect(DisplayNameSchema.safeParse('   ').success).toBe(false);
  });

  it('rejects names over 40 chars', () => {
    expect(DisplayNameSchema.safeParse('x'.repeat(41)).success).toBe(false);
  });
});

describe('SetSessionSchema', () => {
  it('accepts valid name', () => {
    expect(SetSessionSchema.safeParse({ name: 'Ada' }).success).toBe(true);
  });
});
