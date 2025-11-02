import { describe, expect, it } from 'vitest';
import {
  listTasksParamsSchema,
  taskCollectionSchema,
  taskDraftSchema,
  taskSchema,
} from './taskSchemas';

const isoString = (value: string) => new Date(value).toISOString();

describe('taskSchema', () => {
  it('parses a valid task payload', () => {
    const parsed = taskSchema.parse({
      id: 'b4f1b69d-16fd-456e-9b68-22a3a4ec1d9c',
      title: 'Refine designs',
      status: 'todo',
      priority: 3,
      dueDate: isoString('2024-11-30T10:00:00.000Z'),
      tags: ['design', 'ux'],
      version: 2,
      createdAt: isoString('2024-11-01T08:00:00.000Z'),
      updatedAt: isoString('2024-11-20T12:00:00.000Z'),
    });
    expect(parsed.title).toBe('Refine designs');
    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.tags).toEqual(['design', 'ux']);
  });

  it('deduplicates tags and trims whitespace', () => {
    const parsed = taskSchema.parse({
      id: 'fc9e45d1-16fd-456e-9b68-22a3a4ec1d9c',
      title: 'Ship release',
      status: 'doing',
      priority: 2,
      dueDate: null,
      tags: ['release ', ' release', 'dev'],
      version: 1,
      createdAt: isoString('2024-11-10T08:00:00.000Z'),
      updatedAt: isoString('2024-11-11T08:00:00.000Z'),
    });
    expect(parsed.tags).toEqual(['release', 'dev']);
  });
});

describe('taskDraftSchema', () => {
  it('validates required fields', () => {
    const result = taskDraftSchema.safeParse({
      title: 'Implement OAuth',
      status: 'todo',
      priority: 4,
      dueDate: isoString('2024-12-01T09:15:00.000Z'),
      tags: ['auth'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid priority', () => {
    const result = taskDraftSchema.safeParse({
      title: 'Implement API',
      status: 'doing',
      priority: 10,
      dueDate: null,
      tags: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('taskCollectionSchema', () => {
  it('validates meta information', () => {
    const parsed = taskCollectionSchema.parse({
      data: [
        {
          id: '04c9f4a8-16fd-456e-9b68-22a3a4ec1d9c',
          title: 'Write docs',
          status: 'done',
          priority: 1,
          dueDate: null,
          tags: [],
          version: 5,
          createdAt: isoString('2024-10-10T09:00:00.000Z'),
          updatedAt: isoString('2024-10-12T10:00:00.000Z'),
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 25,
        statusCounts: { todo: 0, doing: 0, done: 1 },
      },
    });
    expect(parsed.meta.total).toBe(1);
  });
});

describe('listTasksParamsSchema', () => {
  it('applies defaults for missing values', () => {
    const parsed = listTasksParamsSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
    expect(parsed.sortOrder).toBe('asc');
  });

  it('normalises empty search values to undefined', () => {
    const parsed = listTasksParamsSchema.parse({ search: '   ' });
    expect(parsed.search).toBeUndefined();
  });
});
