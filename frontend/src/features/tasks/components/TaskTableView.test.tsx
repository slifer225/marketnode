import { http, HttpResponse } from 'msw';
import {
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  expect,
  it,
  vi,
} from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import type { TaskTableView } from './TaskTableView';

const API_BASE_URL = 'http://localhost:3100/';
const API_TOKEN = 'test-token';

type TaskTableViewType = typeof TaskTableView;

interface ApiTask {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: number;
  dueDate: string | null;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

const now = () => new Date().toISOString();

const buildListResponse = (tasks: readonly ApiTask[]) => ({
  data: tasks,
  meta: {
    total: tasks.length,
    page: 1,
    pageSize: 25,
    statusCounts: {
      todo: tasks.filter((task) => task.status === 'todo').length,
      doing: tasks.filter((task) => task.status === 'doing').length,
      done: tasks.filter((task) => task.status === 'done').length,
    },
  },
});

describe('TaskTableView', () => {
  let tasks: ApiTask[];
  let TaskTableViewComponent: TaskTableViewType;
  let originalFetch: typeof fetch;

  beforeAll(async () => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (init && 'signal' in init) {
        const { signal, ...rest } = init as RequestInit & { signal?: unknown };
        void signal;
        return originalFetch(input, rest);
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    import.meta.env.VITE_API_BASE_URL = API_BASE_URL;
    import.meta.env.VITE_API_TOKEN = API_TOKEN;
    TaskTableViewComponent = (await import('./TaskTableView')).TaskTableView;
  });

  beforeEach(() => {
    tasks = [
      {
        id: '2ebb0d3e-4816-4d8f-80c5-91a8beb783d5',
        title: 'Alpha task',
        status: 'todo',
        priority: 3,
        dueDate: null,
        tags: ['alpha'],
        version: 0,
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: '4a9997c8-46ac-4c8a-8306-15574281cb17',
        title: 'Bravo task',
        status: 'doing',
        priority: 2,
        dueDate: now(),
        tags: ['bravo', 'ops'],
        version: 1,
        createdAt: now(),
        updatedAt: now(),
      },
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  const registerListHandler = () => {
    server.use(
      http.get(`${API_BASE_URL}tasks`, () => HttpResponse.json(buildListResponse(tasks))),
    );
  };

  const expectAuthorized = (headers: Headers) => {
    const auth = headers.get('authorization');
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
    return null;
  };

  it('renders rows returned by the API', async () => {
    registerListHandler();

    renderWithProviders(<TaskTableViewComponent />);

    expect(await screen.findByText('Alpha task')).toBeInTheDocument();
    expect(screen.getByText('Bravo task')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + two data rows
  });

  it('allows updating a task status via the inline select', async () => {
    registerListHandler();
    server.use(
      http.patch(`${API_BASE_URL}tasks/:id`, async ({ params, request }) => {
        const authProblem = expectAuthorized(request.headers);
        if (authProblem) {
          return authProblem;
        }
        const body = (await request.json()) as Record<string, unknown>;
        const index = tasks.findIndex((task) => task.id === params.id);
        if (index === -1) {
          return HttpResponse.json(
            {
              type: 'https://example.com/problems/not-found',
              title: 'Not Found',
              status: 404,
            },
            { status: 404 },
          );
        }
        const current = tasks[index];
        const updated: ApiTask = {
          ...current,
          title: typeof body.title === 'string' ? body.title : current.title,
          status:
            typeof body.status === 'string'
              ? (body.status as ApiTask['status'])
              : current.status,
          priority: typeof body.priority === 'number' ? body.priority : current.priority,
          dueDate: 'dueDate' in body ? (body.dueDate as string | null) : current.dueDate,
          tags: Array.isArray(body.tags) ? (body.tags as string[]) : current.tags,
          version: current.version + 1,
          updatedAt: now(),
        };
        tasks[index] = updated;
        return HttpResponse.json(updated);
      }),
    );

    renderWithProviders(<TaskTableViewComponent />);

    const rows = await screen.findAllByRole('row');
    const taskRow = rows.find((row) => within(row).queryByText('Alpha task'));
    if (!taskRow) {
      throw new Error('Expected to find row for Alpha task');
    }
    const statusSelect = within(taskRow).getByRole('combobox');
    await userEvent.selectOptions(statusSelect, 'done');

    await waitFor(() =>
      expect(screen.getByText('Task "Alpha task" moved to Done')).toBeInTheDocument(),
    );
    expect((statusSelect as HTMLSelectElement).value).toBe('done');
  });

  it('supports creating and deleting tasks via the UI', async () => {
    registerListHandler();
    server.use(
      http.post(`${API_BASE_URL}tasks`, async ({ request }) => {
        const authProblem = expectAuthorized(request.headers);
        if (authProblem) {
          return authProblem;
        }
        const body = (await request.json()) as Record<string, unknown>;
        const rawTitle = body.title;
        const newTask: ApiTask = {
          id: 'dd2e1c88-7a58-4ae6-aa69-88e6c7441de8',
          title: typeof rawTitle === 'string' ? rawTitle : 'Untitled',
          status: (body.status as ApiTask['status']) ?? 'todo',
          priority: typeof body.priority === 'number' ? body.priority : 3,
          dueDate: ('dueDate' in body ? (body.dueDate as string | null) : null) ?? null,
          tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
          version: 0,
          createdAt: now(),
          updatedAt: now(),
        };
        tasks = [newTask, ...tasks];
        return HttpResponse.json(newTask, { status: 201 });
      }),
      http.delete(`${API_BASE_URL}tasks/:id`, ({ params, request }) => {
        const authProblem = expectAuthorized(request.headers);
        if (authProblem) {
          return authProblem;
        }
        const index = tasks.findIndex((task) => task.id === params.id);
        if (index === -1) {
          return HttpResponse.json(
            {
              type: 'https://example.com/problems/not-found',
              title: 'Not Found',
              status: 404,
            },
            { status: 404 },
          );
        }
        tasks.splice(index, 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<TaskTableViewComponent />);

    const newTaskButtons = await screen.findAllByRole('button', { name: /\+ New task/i });
    await userEvent.click(newTaskButtons[0]);

    const titleInput = await screen.findByLabelText('Title');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New integration task');

    const submitButton = screen.getByRole('button', { name: /Create task/i });
    await userEvent.click(submitButton);

    const createdTask = await screen.findByText('New integration task');
    expect(createdTask).toBeInTheDocument();

    const createdRow = createdTask.closest('tr');
    if (!createdRow) {
      throw new Error('Expected created task row to exist');
    }
    const deleteButton = within(createdRow).getByRole('button', { name: 'Delete' });
    await userEvent.click(deleteButton);

    const deleteDialog = await screen.findByRole('dialog', { name: /Delete task/i });
    expect(
      within(deleteDialog).getByText(
        /Are you sure you want to delete "New integration task"\?/i,
      ),
    ).toBeInTheDocument();

    const confirmDeleteButton = within(deleteDialog).getByRole('button', {
      name: 'Delete',
    });
    await userEvent.click(confirmDeleteButton);

    await waitFor(() =>
      expect(screen.queryByText('New integration task')).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByText('Task "New integration task" deleted'),
    ).toBeInTheDocument();
  });
});
