import { z } from 'zod';
import type { Brand } from '@/lib/brand';

export const taskStatusSchema = z.enum(['todo', 'doing', 'done']);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export type TaskId = Brand<string, 'TaskId'>;

const taskIdSchema = z
  .string()
  .uuid()
  .transform((value) => value as TaskId);

const isoDateTimeStringSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const nullableIsoDateSchema = z
  .union([z.string().datetime({ offset: true }), z.null()])
  .transform((value) => {
    if (value === null) {
      return null;
    }
    return new Date(value);
  });

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .refine((value) => /\S/.test(value), {
    message: 'Tags must contain a non-whitespace character',
  });

export const taskSchema = z.object({
  id: taskIdSchema,
  title: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .refine((value) => /\S/.test(value), {
      message: 'Title must contain a non-whitespace character',
    }),
  status: taskStatusSchema,
  priority: z.number().int().min(1).max(5),
  dueDate: nullableIsoDateSchema,
  tags: z
    .array(tagSchema)
    .max(20)
    .transform((tags) => Array.from(new Set(tags))),
  version: z.number().int().min(0),
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema,
});

export type Task = z.infer<typeof taskSchema>;

export const taskCollectionSchema = z.object({
  data: z.array(taskSchema),
  meta: z.object({
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    statusCounts: z.object({
      todo: z.number().int().min(0),
      doing: z.number().int().min(0),
      done: z.number().int().min(0),
    }),
  }),
});

export type TaskCollection = z.infer<typeof taskCollectionSchema>;

export const taskSortBySchema = z.enum(['priority', 'dueDate']);

export type TaskSortBy = z.infer<typeof taskSortBySchema>;

export const taskSortOrderSchema = z.enum(['asc', 'desc']);

export type TaskSortOrder = z.infer<typeof taskSortOrderSchema>;

const optionalFilterString = (min: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().min(min).max(max).optional());

export const listTasksParamsSchema = z.object({
  status: taskStatusSchema.optional(),
  tag: optionalFilterString(1, 30),
  search: optionalFilterString(1, 120),
  sortBy: taskSortBySchema.optional(),
  sortOrder: taskSortOrderSchema.default('asc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type ListTasksParams = z.input<typeof listTasksParamsSchema>;

export type NormalizedListTasksParams = z.output<typeof listTasksParamsSchema>;

export const taskDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(120)
    .refine((value) => /\S/.test(value), {
      message: 'Title must contain a non-whitespace character',
    }),
  status: taskStatusSchema,
  priority: z.number().int().min(1).max(5),
  dueDate: z.union([z.string().datetime({ offset: true }), z.null()]),
  tags: z
    .array(tagSchema)
    .max(20)
    .transform((tags) => Array.from(new Set(tags))),
});

export type TaskDraft = z.infer<typeof taskDraftSchema>;

export const createTaskPayloadSchema = z.object({
  title: taskDraftSchema.shape.title,
  status: taskDraftSchema.shape.status.optional(),
  priority: taskDraftSchema.shape.priority.optional(),
  dueDate: taskDraftSchema.shape.dueDate.optional(),
  tags: taskDraftSchema.shape.tags.optional(),
});

export type CreateTaskPayload = z.infer<typeof createTaskPayloadSchema>;

export const updateTaskPayloadSchema = createTaskPayloadSchema.partial().extend({
  version: z.number().int().min(0),
});

export type UpdateTaskPayload = z.infer<typeof updateTaskPayloadSchema>;
