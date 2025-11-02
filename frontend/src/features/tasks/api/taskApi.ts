import { ZodError, type ZodType } from 'zod';
import { TaskApiError, isProblemDetails, problemDetailsSchema } from '@/lib/problem';
import {
  type CreateTaskPayload,
  type ListTasksParams,
  type NormalizedListTasksParams,
  type Task,
  type TaskDraft,
  type TaskId,
  type TaskStatus,
  type TaskSortOrder,
  type UpdateTaskPayload,
  createTaskPayloadSchema,
  listTasksParamsSchema,
  taskCollectionSchema,
  taskDraftSchema,
  taskSchema,
  taskStatusSchema,
  updateTaskPayloadSchema,
} from './taskSchemas';

const HttpMethod = {
  DELETE: 'DELETE',
  GET: 'GET',
  PATCH: 'PATCH',
  POST: 'POST',
} as const;

type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

const readEnvString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('VITE_API_BASE_URL must not be empty');
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

const rawBaseUrl = readEnvString(import.meta.env.VITE_API_BASE_URL);
const API_BASE_URL = normalizeBaseUrl(
  rawBaseUrl && rawBaseUrl.trim().length > 0 ? rawBaseUrl : 'http://localhost:3000',
);
const rawToken = readEnvString(import.meta.env.VITE_API_TOKEN);
const API_TOKEN = rawToken ?? '';

const JSON_MEDIA_TYPE = 'application/json';

const parseJson = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return undefined;
  }
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return undefined;
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to parse JSON response';
    throw createUnexpectedError(`Failed to parse JSON response: ${message}`);
  }
};

const createUnexpectedError = (message: string): TaskApiError =>
  new TaskApiError({ kind: 'unexpected', error: new Error(message) });

const ensureAuthToken = (): TaskApiError | null =>
  API_TOKEN.trim().length === 0
    ? new TaskApiError({
        kind: 'configuration',
        message:
          'VITE_API_TOKEN is required for mutating task requests. Please define it in your frontend .env file.',
      })
    : null;

const buildUrl = (
  path: string,
  params?: Partial<Record<string, string | number>>,
): URL => {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }
  return url;
};

interface RequestOptionsBase {
  readonly method?: HttpMethod | undefined;
  readonly body?: unknown;
  readonly params?: Partial<Record<string, string | number>>;
  readonly signal?: AbortSignal | undefined;
  readonly requiresAuth?: boolean | undefined;
}

type SchemaOutput<TSchema extends ZodType<unknown>> = TSchema['_output'];

interface RequestOptionsWithSchema<TSchema extends ZodType<unknown>>
  extends RequestOptionsBase {
  readonly schema: TSchema;
}

type RequestOptionsWithoutSchema = RequestOptionsBase & {
  readonly schema?: undefined;
};

async function request<TSchema extends ZodType<unknown>>(
  path: string,
  options: RequestOptionsWithSchema<TSchema>,
): Promise<SchemaOutput<TSchema>>;
async function request(
  path: string,
  options?: RequestOptionsWithoutSchema,
): Promise<void>;
async function request<TSchema extends ZodType<unknown>>(
  path: string,
  options: RequestOptionsWithSchema<TSchema> | RequestOptionsWithoutSchema = {},
): Promise<SchemaOutput<TSchema> | void> {
  const { method = HttpMethod.GET, body, params, requiresAuth, signal } = options;
  const schema =
    'schema' in options && options.schema !== undefined ? options.schema : undefined;

  if (requiresAuth) {
    const missingTokenError = ensureAuthToken();
    if (missingTokenError) {
      throw missingTokenError;
    }
  }

  const headers = new Headers();
  headers.set('Accept', JSON_MEDIA_TYPE);
  if (body !== undefined) {
    headers.set('Content-Type', JSON_MEDIA_TYPE);
  }
  if (requiresAuth && API_TOKEN) {
    headers.set('Authorization', `Bearer ${API_TOKEN}`);
  }

  const requestInit: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  if (signal && typeof AbortSignal !== 'undefined' && signal instanceof AbortSignal) {
    requestInit.signal = signal;
  }

  try {
    const response = await fetch(buildUrl(path, params), requestInit);

    if (!response.ok) {
      const parsed = await parseJson(response).catch(() => {
        throw createUnexpectedError(
          `Failed to read error response (HTTP ${response.status})`,
        );
      });
      if (parsed && isProblemDetails(parsed)) {
        throw new TaskApiError({
          kind: 'problem',
          problem: problemDetailsSchema.parse(parsed),
        });
      }
      throw createUnexpectedError(`Unexpected error response (HTTP ${response.status})`);
    }

    if (!schema) {
      return undefined;
    }

    const data = await parseJson(response);
    try {
      return schema.parse(data) as TSchema['_output'];
    } catch (error) {
      if (error instanceof ZodError) {
        throw createUnexpectedError(`Response validation failed: ${error.message}`);
      }
      throw createUnexpectedError('Response validation failed.');
    }
  } catch (error) {
    if (error instanceof TaskApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new TaskApiError({
      kind: 'network',
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

const normalizeListParams = (params: ListTasksParams): NormalizedListTasksParams =>
  listTasksParamsSchema.parse(params);

const toCreatePayload = (draft: TaskDraft): CreateTaskPayload =>
  createTaskPayloadSchema.parse({
    title: draft.title,
    status: draft.status,
    priority: draft.priority,
    dueDate: draft.dueDate,
    tags: draft.tags.length > 0 ? draft.tags : undefined,
  });

const toUpdatePayload = (draft: TaskDraft, version: number): UpdateTaskPayload =>
  updateTaskPayloadSchema.parse({
    title: draft.title,
    status: draft.status,
    priority: draft.priority,
    dueDate: draft.dueDate,
    tags: draft.tags,
    version,
  });

export interface TaskListResponse {
  readonly tasks: Task[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly statusCounts: Record<TaskStatus, number>;
}

const CACHE_TTL_MS = 30_000;

interface TaskListCacheEntry {
  readonly data: TaskListResponse;
  readonly expiresAt: number;
}

const taskListCache = new Map<string, TaskListCacheEntry>();

const buildListCacheKey = (params: NormalizedListTasksParams): string =>
  JSON.stringify(params);

const cloneTask = (task: Task): Task => ({
  ...task,
  tags: [...task.tags],
  dueDate: task.dueDate ? new Date(task.dueDate) : null,
  createdAt: new Date(task.createdAt),
  updatedAt: new Date(task.updatedAt),
});

const cloneTaskListResponse = (response: TaskListResponse): TaskListResponse => ({
  tasks: response.tasks.map(cloneTask),
  total: response.total,
  page: response.page,
  pageSize: response.pageSize,
  statusCounts: { ...response.statusCounts },
});

const getCachedTaskList = (key: string): TaskListResponse | null => {
  const entry = taskListCache.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    taskListCache.delete(key);
    return null;
  }
  return cloneTaskListResponse(entry.data);
};

const setCachedTaskList = (key: string, value: TaskListResponse): void => {
  taskListCache.set(key, {
    data: cloneTaskListResponse(value),
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

export const clearTaskListCache = (): void => {
  taskListCache.clear();
};

export const listTasks = async (
  params: ListTasksParams,
  signal?: AbortSignal,
): Promise<TaskListResponse> => {
  const normalized = normalizeListParams(params);
  const cacheKey = buildListCacheKey(normalized);
  const cached = getCachedTaskList(cacheKey);
  if (cached) {
    return cached;
  }
  const queryParams: Partial<Record<string, string | number>> = {
    page: normalized.page,
    pageSize: normalized.pageSize,
    sortOrder: normalized.sortOrder,
  };
  if (normalized.status) {
    queryParams.status = normalized.status;
  }
  if (normalized.tag) {
    queryParams.tag = normalized.tag;
  }
  if (normalized.search) {
    queryParams.search = normalized.search;
  }
  if (normalized.sortBy) {
    queryParams.sortBy = normalized.sortBy;
  }

  const response = await request('/tasks', {
    params: queryParams,
    schema: taskCollectionSchema,
    signal,
  });
  const result: TaskListResponse = {
    tasks: response.data,
    total: response.meta.total,
    page: response.meta.page,
    pageSize: response.meta.pageSize,
    statusCounts: response.meta.statusCounts,
  };
  setCachedTaskList(cacheKey, result);
  return result;
};

export const createTask = async (
  draft: TaskDraft,
  signal?: AbortSignal,
): Promise<Task> => {
  const normalizedDraft = taskDraftSchema.parse(draft);
  const payload = toCreatePayload(normalizedDraft);
  const response = await request('/tasks', {
    method: HttpMethod.POST,
    body: payload,
    schema: taskSchema,
    signal,
    requiresAuth: true,
  });
  clearTaskListCache();
  return response;
};

export const updateTask = async (
  taskId: TaskId,
  draft: TaskDraft,
  version: number,
  signal?: AbortSignal,
): Promise<Task> => {
  const normalizedDraft = taskDraftSchema.parse(draft);
  const payload = toUpdatePayload(normalizedDraft, version);
  const response = await request(`/tasks/${taskId}`, {
    method: HttpMethod.PATCH,
    body: payload,
    schema: taskSchema,
    signal,
    requiresAuth: true,
  });
  clearTaskListCache();
  return response;
};

export const deleteTask = async (taskId: TaskId, signal?: AbortSignal): Promise<void> => {
  await request(`/tasks/${taskId}`, {
    method: HttpMethod.DELETE,
    signal,
    requiresAuth: true,
  });
  clearTaskListCache();
};

export const isTaskStatus = (value: string): value is TaskStatus =>
  taskStatusSchema.safeParse(value).success;

export const isSortOrder = (value: string): value is TaskSortOrder =>
  value === 'asc' || value === 'desc';
