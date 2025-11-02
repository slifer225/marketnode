import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import { TaskApiError } from '@/lib/problem';
import { server } from '@/test/server';

const API_BASE_URL = 'http://localhost:3100/';
const API_TOKEN = 'test-token';

const loadModule = async () => {
  import.meta.env.VITE_API_BASE_URL = API_BASE_URL;
  import.meta.env.VITE_API_TOKEN = API_TOKEN;
  const module = await import('./taskApi');
  module.clearTaskListCache();
  return module;
};

const sampleTask = {
  id: 'd0a1a0de-0a9a-4a0b-a0a0-2b7b0a0b0c0d',
  title: 'Sample task',
  status: 'todo',
  priority: 3,
  dueDate: new Date('2024-12-01T10:00:00.000Z').toISOString(),
  tags: ['alpha'],
  version: 1,
  createdAt: new Date('2024-11-01T08:00:00.000Z').toISOString(),
  updatedAt: new Date('2024-11-10T08:00:00.000Z').toISOString(),
};

describe('taskApi', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('lists tasks', async () => {
    server.use(
      http.get(`${API_BASE_URL}tasks`, () =>
        HttpResponse.json({
          data: [sampleTask],
          meta: {
            total: 1,
            page: 1,
            pageSize: 25,
            statusCounts: { todo: 1, doing: 0, done: 0 },
          },
        }),
      ),
    );

    const { listTasks } = await loadModule();
    const response = await listTasks({});
    expect(response.tasks).toHaveLength(1);
    expect(response.tasks[0].title).toBe('Sample task');
  });

  it('creates a task with authentication', async () => {
    server.use(
      http.post(`${API_BASE_URL}tasks`, async ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth !== `Bearer ${API_TOKEN}`) {
          return HttpResponse.json(
            {
              type: 'https://example.com/problems/missing-token',
              title: 'Unauthorized',
              status: 401,
            },
            { status: 401 },
          );
        }
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...sampleTask,
          title: body.title,
          id: '4205f87b-24b4-4103-a857-1821e4fe60f0',
        });
      }),
    );

    const { createTask } = await loadModule();
    const created = await createTask({
      title: 'Created via API',
      status: 'todo',
      priority: 3,
      dueDate: null,
      tags: [],
    });
    expect(created.title).toBe('Created via API');
  });

  it('bubbles up version conflicts as problem details', async () => {
    server.use(
      http.patch(`${API_BASE_URL}tasks/:id`, () =>
        HttpResponse.json(
          {
            type: 'https://example.com/problems/version-conflict',
            title: 'Version conflict',
            status: 409,
            detail: 'The task was updated by another request. Please refetch.',
          },
          { status: 409 },
        ),
      ),
    );

    const { updateTask } = await loadModule();
    try {
      await updateTask(
        'd0a1a0de-0a9a-4a0b-a0a0-2b7b0a0b0c0d',
        {
          title: 'Update attempt',
          status: 'doing',
          priority: 2,
          dueDate: null,
          tags: [],
        },
        1,
      );
      throw new Error('Expected updateTask to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(TaskApiError);
      expect((error as TaskApiError).detail.kind).toBe('problem');
    }
  });

  it('caches list responses until invalidated', async () => {
    let callCount = 0;
    server.use(
      http.get(`${API_BASE_URL}tasks`, () => {
        callCount += 1;
        return HttpResponse.json({
          data: [sampleTask],
          meta: {
            total: 1,
            page: 1,
            pageSize: 25,
            statusCounts: { todo: 1, doing: 0, done: 0 },
          },
        });
      }),
    );

    const { listTasks } = await loadModule();
    const first = await listTasks({});
    expect(first.tasks).toHaveLength(1);
    const second = await listTasks({});
    expect(second.tasks[0].id).toBe(sampleTask.id);
    expect(callCount).toBe(1);
  });

  it('invalidates cache after create task', async () => {
    let listCallCount = 0;
    server.use(
      http.get(`${API_BASE_URL}tasks`, () => {
        listCallCount += 1;
        const title = listCallCount === 1 ? 'Sample task' : 'Created via API';
        return HttpResponse.json({
          data: [{ ...sampleTask, title }],
          meta: {
            total: 1,
            page: 1,
            pageSize: 25,
            statusCounts: { todo: 1, doing: 0, done: 0 },
          },
        });
      }),
      http.post(`${API_BASE_URL}tasks`, () =>
        HttpResponse.json({
          ...sampleTask,
          id: '4205f87b-24b4-4103-a857-1821e4fe60f0',
          title: 'Created via API',
        }),
      ),
    );

    const { listTasks, createTask } = await loadModule();
    const initial = await listTasks({});
    expect(initial.tasks[0].title).toBe('Sample task');
    expect(listCallCount).toBe(1);

    await createTask({
      title: 'Created via API',
      status: 'todo',
      priority: 3,
      dueDate: null,
      tags: [],
    });

    const refreshed = await listTasks({});
    expect(listCallCount).toBe(2);
    expect(refreshed.tasks[0].title).toBe('Created via API');
  });
});
