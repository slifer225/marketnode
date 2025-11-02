import { TaskEntity } from './entities/task.entity';
import { TaskSortBy, TaskSortOrder } from './dto/list-tasks-query.dto';
import { TaskStatus } from './task-status.enum';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface ListTasksOptions {
  status?: TaskStatus;
  tag?: string;
  search?: string;
  sortBy?: TaskSortBy;
  sortOrder: TaskSortOrder;
  page: number;
  pageSize: number;
}

export interface ListTasksResult {
  data: TaskEntity[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<TaskStatus, number>;
}

export interface TaskRepository {
  create(task: TaskEntity): Promise<TaskEntity>;
  save(task: TaskEntity): Promise<TaskEntity>;
  findById(id: string): Promise<TaskEntity | null>;
  delete(id: string): Promise<void>;
  list(options: ListTasksOptions): Promise<ListTasksResult>;
}
