import { randomUUID } from 'node:crypto';
import { ProblemDetailsException } from '../common/problem-details';
import type { Cache } from 'cache-manager';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  ListTasksOptions,
  ListTasksResult,
  TaskRepository,
} from './task.repository';
import { TaskStatus } from './task-status.enum';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';
import { TaskTagEntity } from './entities/task-tag.entity';

class InMemoryTaskRepository implements TaskRepository {
  private readonly store = new Map<string, TaskEntity>();

  create(task: TaskEntity): Promise<TaskEntity> {
    const now = new Date();
    const entity = this.clone({
      ...task,
      id: randomUUID(),
      version: 0,
      createdAt: now,
      updatedAt: now,
    });
    this.store.set(entity.id, entity);
    return Promise.resolve(this.clone(entity));
  }

  save(task: TaskEntity): Promise<TaskEntity> {
    const existing = this.store.get(task.id);
    if (!existing) {
      throw new Error('Task not found');
    }
    const updated = this.clone({
      ...existing,
      ...task,
      version: existing.version + 1,
      updatedAt: new Date(),
    });
    this.store.set(updated.id, updated);
    return Promise.resolve(this.clone(updated));
  }

  findById(id: string): Promise<TaskEntity | null> {
    const item = this.store.get(id);
    return Promise.resolve(item ? this.clone(item) : null);
  }

  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }

  list(options: ListTasksOptions): Promise<ListTasksResult> {
    const items = Array.from(this.store.values())
      .map((task) => this.clone(task))
      .filter((task) =>
        options.status ? task.status === options.status : true,
      )
      .filter((task) =>
        options.tag
          ? (task.tagEntities?.some((tag) => tag.value === options.tag) ??
            false)
          : true,
      )
      .filter((task) =>
        options.search
          ? task.title.toLowerCase().includes(options.search.toLowerCase())
          : true,
      );

    const offset = (options.page - 1) * options.pageSize;
    const data = items.slice(offset, offset + options.pageSize);
    const statusCounts: Record<TaskStatus, number> = {
      todo: 0,
      doing: 0,
      done: 0,
    };
    for (const task of this.store.values()) {
      statusCounts[task.status] += 1;
    }
    return Promise.resolve({
      data,
      total: items.length,
      page: options.page,
      pageSize: options.pageSize,
      statusCounts,
    });
  }

  private clone(task: TaskEntity): TaskEntity {
    const copy = new TaskEntity();
    Object.assign(copy, task);
    copy.tagEntities = (task.tagEntities ?? []).map((tag) => {
      const tagCopy = new TaskTagEntity();
      Object.assign(tagCopy, tag);
      tagCopy.task = copy;
      return tagCopy;
    });
    return copy;
  }
}

describe('TasksService', () => {
  let repository: InMemoryTaskRepository;
  let service: TasksService;
  let cache: Cache;
  let cacheMock: ReturnType<typeof createCacheMock>;

  const createCacheMock = () => {
    const store = new Map<string, unknown>();
    return {
      get: jest.fn((key: string) => Promise.resolve(store.get(key))),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      del: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
    };
  };

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
    cacheMock = createCacheMock();
    cache = cacheMock as unknown as Cache;
    service = new TasksService(repository, cache);
  });

  it('creates a task with sensible defaults', async () => {
    const payload = new CreateTaskDto();
    payload.title = 'Draft PRD';

    const task = await service.createTask(payload);

    expect(task.id).toBeDefined();
    expect(task.status).toBe(TaskStatus.TODO);
    expect(task.priority).toBe(3);
    expect(task.tags).toEqual([]);
  });

  it('enforces optimistic concurrency on updates', async () => {
    const createDto = new CreateTaskDto();
    createDto.title = 'Prototype feature';
    createDto.priority = 2;
    const created = await service.createTask(createDto);

    const updateDto = new UpdateTaskDto();
    updateDto.title = 'Updated feature';
    updateDto.version = created.version - 1;

    await expect(
      service.updateTask(created.id, updateDto),
    ).rejects.toBeInstanceOf(ProblemDetailsException);
  });

  it('returns cached list results for identical queries', async () => {
    const createDto = new CreateTaskDto();
    createDto.title = 'Draft release notes';
    await service.createTask(createDto);

    const query = new ListTasksQueryDto();
    const listSpy = jest.spyOn(repository, 'list');

    await service.listTasks(query);
    await service.listTasks(query);

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(cacheMock.get).toHaveBeenCalledTimes(2);
    expect(cacheMock.set).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached list results after an update', async () => {
    const createDto = new CreateTaskDto();
    createDto.title = 'Refine cache behaviour';
    const created = await service.createTask(createDto);

    const query = new ListTasksQueryDto();
    await service.listTasks(query);
    await service.listTasks(query);

    cacheMock.del.mockClear();
    cacheMock.get.mockClear();
    cacheMock.set.mockClear();

    const updateDto = new UpdateTaskDto();
    updateDto.title = 'Refined cache behaviour';
    updateDto.version = created.version;
    await service.updateTask(created.id, updateDto);

    expect(cacheMock.del).toHaveBeenCalled();

    const listSpy = jest.spyOn(repository, 'list');
    await service.listTasks(query);
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it('includes global status counts in list responses', async () => {
    const todoDto = new CreateTaskDto();
    todoDto.title = 'Todo task';
    await service.createTask(todoDto);

    const doingDto = new CreateTaskDto();
    doingDto.title = 'Doing task';
    doingDto.status = TaskStatus.DOING;
    await service.createTask(doingDto);

    const doneDto = new CreateTaskDto();
    doneDto.title = 'Done task';
    doneDto.status = TaskStatus.DONE;
    await service.createTask(doneDto);

    const response = await service.listTasks(new ListTasksQueryDto());

    expect(response.meta.statusCounts).toEqual({
      todo: 1,
      doing: 1,
      done: 1,
    });
  });
});
