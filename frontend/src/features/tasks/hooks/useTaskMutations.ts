import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, updateTask } from '../api/taskApi';
import type { Task, TaskDraft, TaskId } from '../api/taskSchemas';
import type { TaskApiError } from '@/lib/problem';
import type { TaskListResponse } from '../api/taskApi';

const TASKS_QUERY_KEY = ['tasks'] as const;

const toTaskDate = (value: string | null): Date | null =>
  value ? new Date(value) : null;

const updateTaskInResponse = (
  response: TaskListResponse,
  taskId: TaskId,
  updater: (task: Task) => Task,
): TaskListResponse => ({
  ...response,
  tasks: response.tasks.map((task) => (task.id === taskId ? updater(task) : task)),
});

const removeTaskFromResponse = (
  response: TaskListResponse,
  taskId: TaskId,
): TaskListResponse => ({
  ...response,
  total: Math.max(0, response.total - 1),
  tasks: response.tasks.filter((task) => task.id !== taskId),
});

const addTaskToResponse = (response: TaskListResponse, task: Task): TaskListResponse => {
  if (response.page !== 1) {
    return response;
  }
  if (response.tasks.length >= response.pageSize) {
    return response;
  }
  return {
    ...response,
    total: response.total + 1,
    tasks: [task, ...response.tasks],
  };
};

type TaskQuerySnapshot = readonly [readonly unknown[], TaskListResponse | undefined];

const applyToTaskQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  apply: (data: TaskListResponse, queryKey: readonly unknown[]) => TaskListResponse,
) => {
  const queries = queryClient.getQueriesData<TaskListResponse>({
    queryKey: TASKS_QUERY_KEY,
  });
  for (const [queryKey, data] of queries) {
    if (!data) {
      continue;
    }
    queryClient.setQueryData(queryKey, apply(data, queryKey));
  }
};

export const useTaskMutations = () => {
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation<
    Task,
    TaskApiError,
    { readonly draft: TaskDraft }
  >({
    mutationFn: ({ draft }) => createTask(draft),
    onSuccess: (task) => {
      applyToTaskQueries(queryClient, (data) => addTaskToResponse(data, task));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }).catch(() => {
        // best effort
      });
    },
  });

  const updateTaskMutation = useMutation<
    Task,
    TaskApiError,
    { readonly taskId: TaskId; readonly draft: TaskDraft; readonly version: number },
    { readonly snapshots: readonly TaskQuerySnapshot[] }
  >({
    mutationFn: ({ taskId, draft, version }) => updateTask(taskId, draft, version),
    onMutate: ({ taskId, draft, version }) => {
      const snapshots = queryClient.getQueriesData<TaskListResponse>({
        queryKey: TASKS_QUERY_KEY,
      }) as TaskQuerySnapshot[];

      const optimisticUpdatedAt = new Date();

      applyToTaskQueries(queryClient, (data) =>
        updateTaskInResponse(data, taskId, (task) => ({
          ...task,
          title: draft.title,
          status: draft.status,
          priority: draft.priority,
          tags: draft.tags,
          dueDate: toTaskDate(draft.dueDate),
          version: version + 1,
          updatedAt: optimisticUpdatedAt,
        })),
      );

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }
      for (const [queryKey, snapshot] of context.snapshots) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: (task) => {
      applyToTaskQueries(queryClient, (data) =>
        updateTaskInResponse(data, task.id, () => task),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }).catch(() => {
        // best effort
      });
    },
  });

  const deleteTaskMutation = useMutation<
    void,
    TaskApiError,
    { readonly taskId: TaskId },
    { readonly snapshots: readonly TaskQuerySnapshot[] }
  >({
    mutationFn: ({ taskId }) => deleteTask(taskId),
    onMutate: ({ taskId }) => {
      const snapshots = queryClient.getQueriesData<TaskListResponse>({
        queryKey: TASKS_QUERY_KEY,
      }) as TaskQuerySnapshot[];
      applyToTaskQueries(queryClient, (data) => removeTaskFromResponse(data, taskId));
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }
      for (const [queryKey, snapshot] of context.snapshots) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }).catch(() => {
        // best effort
      });
    },
  });

  return {
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
  };
};
