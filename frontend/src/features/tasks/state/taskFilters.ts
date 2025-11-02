import { listTasksParamsSchema, type TaskStatus } from '../api/taskSchemas';

export type StatusFilter = 'all' | TaskStatus;

export interface TaskFiltersState {
  readonly status: StatusFilter;
  readonly tag: string;
  readonly search: string;
  readonly sortBy: 'priority' | 'dueDate' | '';
  readonly sortOrder: 'asc' | 'desc';
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_FILTERS: TaskFiltersState = {
  status: 'all',
  tag: '',
  search: '',
  sortBy: '',
  sortOrder: 'asc',
  page: 1,
  pageSize: 25,
};

export const toListParams = (filters: TaskFiltersState) =>
  listTasksParamsSchema.parse({
    status: filters.status === 'all' ? undefined : filters.status,
    tag: filters.tag.trim().length > 0 ? filters.tag.trim() : undefined,
    search: filters.search.trim().length > 0 ? filters.search.trim() : undefined,
    sortBy: filters.sortBy === '' ? undefined : filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    pageSize: filters.pageSize,
  });
