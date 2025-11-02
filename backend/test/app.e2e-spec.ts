import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Test as SupertestRequest } from 'supertest';

process.env.API_TOKEN = process.env.API_TOKEN ?? 'test-token';
process.env.DATABASE_PATH = ':memory:';

import { AppModule } from '../src/app.module';
import { ErrorFilter } from '../src/common/filters/error.filter';
import { RequestLoggingInterceptor } from '../src/common/interceptors/request-logging.interceptor';
import {
  ProblemDetails,
  ProblemDetailsException,
  validationErrorsToProblem,
} from '../src/common/problem-details';

type TaskResponse = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly priority: number;
  readonly dueDate: string | null;
  readonly tags: string[];
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type TaskListResponse = {
  readonly data: TaskResponse[];
  readonly meta: {
    readonly total: number;
    readonly page: number;
    readonly pageSize: number;
    readonly statusCounts?: Record<string, number>;
  };
};

type TaskRequestPayload = {
  readonly title?: string;
  readonly status?: string;
  readonly priority?: number;
  readonly dueDate?: string | null;
  readonly tags?: string[];
};

const parseTaskResponse = (value: unknown): TaskResponse => {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid task response shape');
  }
  const record = value as Record<string, unknown>;
  const requiredString = (field: string): string => {
    const result = record[field];
    if (typeof result !== 'string') {
      throw new Error(`Expected ${field} to be a string`);
    }
    return result;
  };
  const requiredNumber = (field: string): number => {
    const result = record[field];
    if (typeof result !== 'number') {
      throw new Error(`Expected ${field} to be a number`);
    }
    return result;
  };
  const tags = record.tags;
  if (!Array.isArray(tags)) {
    throw new Error('Expected tags to be an array');
  }
  return {
    id: requiredString('id'),
    title: requiredString('title'),
    status: requiredString('status'),
    priority: requiredNumber('priority'),
    dueDate:
      record.dueDate === null
        ? null
        : typeof record.dueDate === 'string'
          ? record.dueDate
          : (() => {
              throw new Error('Expected dueDate to be string or null');
            })(),
    tags: tags.map((tag, index) => {
      if (typeof tag !== 'string') {
        throw new Error(`Tag at index ${index} is not a string`);
      }
      return tag;
    }),
    version: requiredNumber('version'),
    createdAt: requiredString('createdAt'),
    updatedAt: requiredString('updatedAt'),
  };
};

const parseTaskListResponse = (value: unknown): TaskListResponse => {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid task list response shape');
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.data) || typeof record.meta !== 'object') {
    throw new Error('Invalid task list response shape');
  }
  return {
    data: record.data.map(parseTaskResponse),
    meta: record.meta as TaskListResponse['meta'],
  };
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const assertStringArray = (value: unknown, context: string): string[] => {
  if (!isStringArray(value)) {
    throw new Error(`Expected ${context} to be an array of strings`);
  }
  return value;
};

const parseProblemDetailsResponse = (value: unknown): ProblemDetails => {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid problem details response shape');
  }
  const record = value as Record<string, unknown>;
  const typeValue = record.type;
  const titleValue = record.title;
  const statusValue = record.status;
  if (typeof typeValue !== 'string') {
    throw new Error('Expected problem type to be a string');
  }
  if (typeof titleValue !== 'string') {
    throw new Error('Expected problem title to be a string');
  }
  if (typeof statusValue !== 'number') {
    throw new Error('Expected problem status to be a number');
  }
  const problem: ProblemDetails = {
    type: typeValue,
    title: titleValue,
    status: statusValue,
  };
  if ('detail' in record) {
    const detailValue = record.detail;
    if (typeof detailValue !== 'string') {
      throw new Error('Expected problem detail to be a string');
    }
    problem.detail = detailValue;
  }
  if ('instance' in record) {
    const instanceValue = record.instance;
    if (typeof instanceValue !== 'string') {
      throw new Error('Expected problem instance to be a string');
    }
    problem.instance = instanceValue;
  }
  if ('errors' in record) {
    const rawErrors = record.errors;
    if (!rawErrors || typeof rawErrors !== 'object') {
      throw new Error('Expected problem errors to be an object');
    }
    const parsedErrors: Record<string, string[]> = {};
    for (const [field, messages] of Object.entries(
      rawErrors as Record<string, unknown>,
    )) {
      parsedErrors[field] = assertStringArray(
        messages,
        `problem errors for ${field}`,
      );
    }
    problem.errors = parsedErrors;
  }
  return problem;
};

describe('Task Tracker API (e2e)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  const apiToken = process.env.API_TOKEN as string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) =>
          new ProblemDetailsException(validationErrorsToProblem(errors)),
      }),
    );
    app.useGlobalFilters(new ErrorFilter());
    app.useGlobalInterceptors(new RequestLoggingInterceptor());
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  const withAuth = (req: SupertestRequest) =>
    req.set('Authorization', `Bearer ${apiToken}`);

  const createTask = async (
    overrides: TaskRequestPayload = {},
  ): Promise<TaskResponse> => {
    const payload = {
      title: 'Ship feature',
      status: 'todo',
      priority: 3,
      dueDate: null,
      tags: ['product'],
      ...overrides,
    };
    const response = await withAuth(request(server).post('/tasks'))
      .send(payload)
      .expect(201);
    return parseTaskResponse(response.body);
  };

  describe('POST /tasks', () => {
    it('rejects writes without a bearer token', async () => {
      const response = await request(server)
        .post('/tasks')
        .send({ title: 'Draft' });
      expect(response.status).toBe(401);
      expect(response.type).toContain('application/problem+json');
      const problem = parseProblemDetailsResponse(response.body);
      expect(problem.type).toBe('https://example.com/problems/missing-token');
    });

    it('rejects invalid bearer tokens', async () => {
      const response = await request(server)
        .post('/tasks')
        .set('Authorization', 'Bearer wrong-token')
        .send({ title: 'Bad auth' });
      expect(response.status).toBe(401);
      const problem = parseProblemDetailsResponse(response.body);
      expect(problem.type).toBe('https://example.com/problems/invalid-token');
    });

    it('creates a task with default values', async () => {
      const created = await createTask({
        title: 'Create integration test',
        tags: [' qa ', 'release'],
      });
      expect(created.title).toBe('Create integration test');
      expect(created.status).toBe('todo');
      expect(created.priority).toBeGreaterThan(0);
      expect(created.tags).toContain('qa');
      expect(created.tags).toContain('release');
    });

    it('validates payloads and returns problem details', async () => {
      const response = await withAuth(request(server).post('/tasks'))
        .send({
          title: ' ',
          priority: 99,
          dueDate: 'not-a-date',
        })
        .expect(400);

      const problem = parseProblemDetailsResponse(response.body);
      expect(problem.type).toBe(
        'https://example.com/problems/validation-error',
      );
      const errors = problem.errors;
      if (!errors) {
        throw new Error('Expected validation errors in response');
      }
      const titleErrors = assertStringArray(
        errors.title,
        'title validation errors',
      );
      expect(titleErrors[0]).toContain('title must contain');
      const priorityErrors = assertStringArray(
        errors.priority,
        'priority validation errors',
      );
      expect(priorityErrors[0]).toContain('must not be greater than');
      const dueDateErrors = assertStringArray(
        errors.dueDate,
        'dueDate validation errors',
      );
      expect(dueDateErrors[0]).toContain('must be a valid ISO 8601');
    });
  });

  describe('GET /tasks', () => {
    it('returns an empty collection initially', async () => {
      const response = await request(server).get('/tasks').expect(200);
      const list = parseTaskListResponse(response.body);
      expect(list.data).toHaveLength(0);
      expect(list.meta.total).toBe(0);
    });

    it('lists tasks with pagination and filters applied', async () => {
      await createTask({ title: 'First task', status: 'todo', priority: 1 });
      await createTask({
        title: 'Second task',
        status: 'doing',
        priority: 5,
        tags: ['ops'],
      });
      await createTask({
        title: 'Third ticket',
        status: 'done',
        tags: ['ops'],
      });

      const filteredResponse = await request(server)
        .get('/tasks')
        .query({ status: 'doing', tag: 'ops', search: 'Second' })
        .expect(200);
      const filtered = parseTaskListResponse(filteredResponse.body);
      expect(filtered.data).toHaveLength(1);
      expect(filtered.data[0].title).toBe('Second task');

      const pagedResponse = await request(server)
        .get('/tasks')
        .query({ page: 2, pageSize: 1, sortBy: 'priority', sortOrder: 'desc' })
        .expect(200);
      const paged = parseTaskListResponse(pagedResponse.body);
      expect(paged.data).toHaveLength(1);
      expect(paged.meta.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('updates a task when the version matches', async () => {
      const created = await createTask({ title: 'Needs update' });
      const response = await withAuth(
        request(server).patch(`/tasks/${created.id}`),
      )
        .send({
          title: 'Updated title',
          version: created.version,
        })
        .expect(200);
      const updated = parseTaskResponse(response.body);
      expect(updated.title).toBe('Updated title');
      expect(updated.version).toBeGreaterThan(created.version);
    });

    it('rejects updates with mismatched versions', async () => {
      const created = await createTask({ title: 'Conflict task' });
      const response = await withAuth(
        request(server).patch(`/tasks/${created.id}`),
      )
        .send({
          title: 'Attempted update',
          version: created.version + 1,
        })
        .expect(409);
      const problem = parseProblemDetailsResponse(response.body);
      expect(problem.type).toBe(
        'https://example.com/problems/version-conflict',
      );
    });

    it('returns 404 when the task does not exist', async () => {
      await withAuth(
        request(server).patch('/tasks/00000000-0000-4000-8000-000000000000'),
      )
        .send({
          title: 'Non-existent',
          version: 0,
        })
        .expect(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('requires authentication', async () => {
      const created = await createTask({ title: 'Delete auth' });
      const response = await request(server).delete(`/tasks/${created.id}`);
      expect(response.status).toBe(401);
      const problem = parseProblemDetailsResponse(response.body);
      expect(problem.type).toBe('https://example.com/problems/missing-token');
    });

    it('removes a task and makes it disappear from listings', async () => {
      const created = await createTask({ title: 'To be deleted' });
      await withAuth(request(server).delete(`/tasks/${created.id}`)).expect(
        204,
      );

      const listResponse = await request(server).get('/tasks');
      const list = parseTaskListResponse(listResponse.body);
      expect(list.data.find((task) => task.id === created.id)).toBeUndefined();
    });

    it('returns 404 for unknown identifiers', async () => {
      await withAuth(
        request(server).delete('/tasks/00000000-0000-4000-8000-000000000001'),
      ).expect(404);
    });
  });
});
