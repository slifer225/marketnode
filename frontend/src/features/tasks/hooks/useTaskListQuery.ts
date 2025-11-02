import { useQuery } from '@tanstack/react-query';
import type { TaskApiError } from '@/lib/problem';
import { listTasks, type TaskListResponse } from '../api/taskApi';
import { type ListTasksParams, listTasksParamsSchema } from '../api/taskSchemas';

export const useTaskListQuery = (params: ListTasksParams) => {
  const normalizedParams = listTasksParamsSchema.parse(params);
  return useQuery<TaskListResponse, TaskApiError>({
    queryKey: ['tasks', normalizedParams],
    queryFn: ({ signal }) => listTasks(normalizedParams, signal),
    throwOnError: false,
  });
};
