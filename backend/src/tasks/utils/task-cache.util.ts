import type {
  ListTasksQueryDto,
  TaskSortOrder,
} from '../dto/list-tasks-query.dto';
import type { TaskStatus } from '../task-status.enum';

type CacheKeyOptions = {
  status?: TaskStatus;
  tag?: string;
  search?: string;
  sortBy?: ListTasksQueryDto['sortBy'];
  sortOrder: TaskSortOrder;
  page?: number;
  pageSize?: number;
};

export const createListCacheKey = (options: CacheKeyOptions): string =>
  `tasks:list:${JSON.stringify({
    status: options.status ?? null,
    tag: options.tag ?? null,
    search: options.search ?? null,
    sortBy: options.sortBy ?? null,
    sortOrder: options.sortOrder,
    page: options.page ?? null,
    pageSize: options.pageSize ?? null,
  })}`;
