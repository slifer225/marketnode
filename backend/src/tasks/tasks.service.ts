import {
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ProblemDetailsException,
  createProblemDetails,
} from '../common/problem-details';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto, TaskSortOrder } from './dto/list-tasks-query.dto';
import {
  TaskCollectionResponseDto,
  TaskResponseDto,
} from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import type { TaskRepository } from './task.repository';
import { TASK_REPOSITORY } from './task.repository';
import type { Cache } from 'cache-manager';
import {
  applyDtoToEntity,
  toTaskCollectionResponse,
  toTaskResponse,
} from './mappers/task-mapper';
import { createListCacheKey } from './utils/task-cache.util';

@Injectable()
export class TasksService {
  private readonly listCacheKeys = new Set<string>();

  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly repository: TaskRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async createTask(dto: CreateTaskDto): Promise<TaskResponseDto> {
    const entity = applyDtoToEntity(new TaskEntity(), dto);
    const saved = await this.repository.create(entity);
    await this.clearListCache();
    return toTaskResponse(saved);
  }

  async listTasks(
    query: ListTasksQueryDto,
  ): Promise<TaskCollectionResponseDto> {
    const sortOrder: TaskSortOrder = query.sortOrder ?? 'asc';
    const search = query.search?.trim();
    const tag = query.tag?.trim();

    const cacheKey = createListCacheKey({
      status: query.status,
      tag,
      search,
      sortBy: query.sortBy,
      sortOrder,
      page: query.page,
      pageSize: query.pageSize,
    });

    const cached =
      await this.cacheManager.get<TaskCollectionResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.repository.list({
      status: query.status,
      tag: tag && tag.length > 0 ? tag : undefined,
      search: search && search.length > 0 ? search : undefined,
      sortBy: query.sortBy,
      sortOrder,
      page: query.page,
      pageSize: query.pageSize,
    });

    const response = toTaskCollectionResponse(result);

    await this.cacheManager.set(cacheKey, response);
    this.listCacheKeys.add(cacheKey);
    return response;
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<TaskResponseDto> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }

    if (task.version !== dto.version) {
      throw new ProblemDetailsException(
        createProblemDetails(HttpStatus.CONFLICT, 'Version conflict', {
          type: 'https://example.com/problems/version-conflict',
          detail:
            'The task was updated by another request. Please refetch and try again.',
        }),
      );
    }

    const updated = await this.repository.save(applyDtoToEntity(task, dto));
    await this.clearListCache();
    return toTaskResponse(updated);
  }

  async deleteTask(id: string): Promise<void> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    await this.repository.delete(id);
    await this.clearListCache();
  }

  private async clearListCache(): Promise<void> {
    if (this.listCacheKeys.size === 0) {
      return;
    }
    await Promise.all(
      Array.from(this.listCacheKeys, (key) => this.cacheManager.del(key)),
    );
    this.listCacheKeys.clear();
  }
}
