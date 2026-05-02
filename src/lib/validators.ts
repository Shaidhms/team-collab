import { z } from 'zod';

export const TaskTextSchema = z
  .string()
  .trim()
  .min(1, 'Task text required')
  .max(280, 'Task text must be 280 characters or fewer');

export const CreateTaskSchema = z.object({
  text: TaskTextSchema,
});

export const UpdateTaskSchema = z
  .object({
    text: TaskTextSchema.optional(),
    done: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const DisplayNameSchema = z
  .string()
  .trim()
  .min(1, 'Name required')
  .max(40, 'Name must be 40 characters or fewer')
  .regex(/^[\p{L}\p{N} _.\-']+$/u, 'Name contains invalid characters');

export const SetSessionSchema = z.object({
  name: DisplayNameSchema,
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type SetSessionInput = z.infer<typeof SetSessionSchema>;
