import { HttpStatus } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ProblemDetailsException,
  createProblemDetails,
} from '../../common/problem-details';
import { CreateTaskDto } from '../dto/create-task.dto';
import type { ListTasksResult } from '../task.repository';
import { TaskStatus } from '../task-status.enum';
import {
  TaskCollectionResponseDto,
  TaskResponseDto,
} from '../dto/task-response.dto';
import { TaskEntity } from '../entities/task.entity';
import { TaskTagEntity } from '../entities/task-tag.entity';

const normalizeTags = (tags: string[] | undefined): string[] | undefined => {
  if (tags === undefined) {
    return undefined;
  }

  const unique = new Set(
    tags
      .map((tag) => tag.trim())
      .filter((tag): tag is string => tag.length > 0),
  );

  return Array.from(unique);
};

export const applyDtoToEntity = (
  entity: TaskEntity,
  dto: Partial<CreateTaskDto>,
): TaskEntity => {
  if ('title' in dto && dto.title !== undefined) {
    entity.title = dto.title.trim();
  }

  if ('status' in dto && dto.status !== undefined) {
    entity.status = dto.status;
  } else if (!entity.status) {
    entity.status = TaskStatus.TODO;
  }

  if ('priority' in dto && dto.priority !== undefined) {
    entity.priority = dto.priority;
  } else if (!entity.priority) {
    entity.priority = 3;
  }

  if ('dueDate' in dto) {
    if (dto.dueDate === null || dto.dueDate === undefined) {
      entity.dueDate = null;
    } else {
      const parsed = new Date(dto.dueDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new ProblemDetailsException(
          createProblemDetails(
            HttpStatus.BAD_REQUEST,
            'Invalid due date provided',
            {
              type: 'https://example.com/problems/invalid-due-date',
              detail: 'dueDate must be a valid ISO-8601 date string or null.',
            },
          ),
        );
      }
      entity.dueDate = parsed;
    }
  }

  const normalisedTags = normalizeTags(dto.tags);
  if (normalisedTags !== undefined) {
    entity.tagEntities = normalisedTags.map((value) => {
      const existing = entity.tagEntities?.find((tag) => tag.value === value);
      if (existing) {
        return existing;
      }
      const tagEntity = new TaskTagEntity();
      tagEntity.value = value;
      tagEntity.task = entity;
      return tagEntity;
    });
  } else if (!entity.tagEntities) {
    entity.tagEntities = [];
  }

  return entity;
};

const taskEntityToPlain = (task: TaskEntity): Record<string, unknown> => ({
  id: task.id,
  title: task.title,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  tags: task.tagEntities?.map((tag) => tag.value) ?? [],
  version: task.version,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

export const toTaskResponse = (task: TaskEntity): TaskResponseDto =>
  plainToInstance(TaskResponseDto, taskEntityToPlain(task), {
    excludeExtraneousValues: true,
  });

export const toTaskCollectionResponse = (
  result: ListTasksResult,
): TaskCollectionResponseDto =>
  plainToInstance(
    TaskCollectionResponseDto,
    {
      data: result.data.map(taskEntityToPlain),
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        statusCounts: result.statusCounts,
      },
    },
    { excludeExtraneousValues: true },
  );
