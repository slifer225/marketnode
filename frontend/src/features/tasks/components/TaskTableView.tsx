import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/app/components/Modal';
import { useToast } from '@/app/providers/ToastProvider';
import { describeApiError } from '@/lib/problem';
import type { TaskApiError } from '@/lib/problem';
import { TaskTable } from './TaskTable';
import { TaskFilters } from './TaskFilters';
import { TaskPagination } from './TaskPagination';
import { TaskForm } from './TaskForm';
import {
  DEFAULT_FILTERS,
  toListParams,
  type TaskFiltersState,
} from '../state/taskFilters';
import { useTaskListQuery } from '../hooks/useTaskListQuery';
import { useTaskMutations } from '../hooks/useTaskMutations';
import type { Task, TaskDraft, TaskId, TaskStatus } from '../api/taskSchemas';
import styles from './TaskTableView.module.css';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done',
};

const toErrorMessage = (error: TaskApiError | null | undefined): string | undefined =>
  error ? describeApiError(error.detail) : undefined;

type SortableColumn = 'priority' | 'dueDate';

export const TaskTableView = (): JSX.Element => {
  const [filters, setFilters] = useState<TaskFiltersState>(DEFAULT_FILTERS);
  const [modalMode, setModalMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingTaskId, setEditingTaskId] = useState<TaskId | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const { showToast } = useToast();

  const listParams = useMemo(() => toListParams(filters), [filters]);
  const taskQuery = useTaskListQuery(listParams);
  const { data, isLoading, isFetching, error } = taskQuery;

  const { createTaskMutation, updateTaskMutation, deleteTaskMutation } =
    useTaskMutations();

  const tasks: readonly Task[] = data?.tasks ?? [];
  const visibleTasks = tasks;

  const activeTask =
    modalMode === 'edit' && editingTaskId
      ? (tasks.find((task) => task.id === editingTaskId) ?? null)
      : null;

  useEffect(() => {
    if (modalMode === 'edit' && !activeTask) {
      setModalMode('closed');
      setEditingTaskId(null);
    }
  }, [modalMode, activeTask]);

  const listErrorMessage = toErrorMessage(error);
  const createErrorMessage = toErrorMessage(createTaskMutation.error);
  const updateErrorMessage = toErrorMessage(updateTaskMutation.error);
  const deleteErrorMessage = toErrorMessage(deleteTaskMutation.error);

  const totalCount = data?.total ?? 0;

  const handleFiltersChange = (updatedFilters: TaskFiltersState) => {
    setFilters(updatedFilters);
  };

  const handleResetFilters = () => setFilters(DEFAULT_FILTERS);

  const handlePageChange = (page: number) => {
    setFilters((current) => ({ ...current, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setFilters((current) => ({ ...current, pageSize, page: 1 }));
  };

  const handleSortRequest = (column: SortableColumn) => {
    setFilters((current) => {
      if (current.sortBy !== column) {
        return { ...current, sortBy: column, sortOrder: 'asc', page: 1 };
      }
      if (current.sortOrder === 'asc') {
        return { ...current, sortBy: column, sortOrder: 'desc', page: 1 };
      }
      return { ...current, sortBy: '', sortOrder: 'asc', page: 1 };
    });
  };

  const handleOpenCreate = () => {
    setEditingTaskId(null);
    setFormKey((counter) => counter + 1);
    setModalMode('create');
  };

  const handleCloseModal = () => {
    setModalMode('closed');
    setEditingTaskId(null);
  };

  const handleCreateTask = (draft: TaskDraft) => {
    createTaskMutation.mutate(
      { draft },
      {
        onSuccess: (created) => {
          handleCloseModal();
          setFormKey((counter) => counter + 1);
          showToast({
            type: 'success',
            message: `Task "${created.title}" created`,
          });
        },
      },
    );
  };

  const handleEditRequest = (task: Task) => {
    setEditingTaskId(task.id);
    setFormKey((counter) => counter + 1);
    setModalMode('edit');
  };

  const handleUpdateTask = (
    task: Task,
    draft: TaskDraft,
    options?: {
      readonly onSuccess?: (updated: Task) => void;
      readonly closeModal?: boolean;
    },
  ) => {
    updateTaskMutation.mutate(
      { taskId: task.id, draft, version: task.version },
      {
        onSuccess: (updated) => {
          options?.onSuccess?.(updated);
          if (options?.closeModal ?? true) {
            handleCloseModal();
          }
        },
      },
    );
  };

  const handleDeleteTask = (task: Task) => {
    if (deleteTaskMutation.isPending) {
      return;
    }
    deleteTaskMutation.reset();
    setPendingDeleteTask(task);
  };

  const handleCloseDeleteModal = () => {
    if (deleteTaskMutation.isPending) {
      return;
    }
    setPendingDeleteTask(null);
    deleteTaskMutation.reset();
  };

  const handleConfirmDelete = () => {
    const task = pendingDeleteTask;
    if (!task || deleteTaskMutation.isPending) {
      return;
    }
    deleteTaskMutation.mutate(
      { taskId: task.id },
      {
        onSuccess: () => {
          setPendingDeleteTask(null);
          showToast({
            type: 'info',
            message: `Task "${task.title}" deleted`,
          });
          if (editingTaskId === task.id) {
            handleCloseModal();
          }
        },
      },
    );
  };

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    const draft: TaskDraft = {
      title: task.title,
      status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      tags: task.tags,
    };
    handleUpdateTask(task, draft, {
      closeModal: false,
      onSuccess: (updated) => {
        showToast({
          type: 'success',
          message: `Task "${updated.title}" moved to ${STATUS_LABELS[updated.status]}`,
        });
      },
    });
  };

  const isModalOpen = modalMode !== 'closed';
  const isDeleteModalOpen = pendingDeleteTask !== null;
  const modalTitle = modalMode === 'edit' ? 'Edit task' : 'Create task';
  const activeSort = filters.sortBy === '' ? null : filters.sortBy;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarHeader}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={handleOpenCreate}
          >
            + New task
          </button>
          <div className={styles.pageSizeGroup}>
            <span className={styles.pageSizeLabel}>Page size</span>
            <select
              className={styles.pageSizeSelect}
              value={filters.pageSize}
              onChange={(event) =>
                handlePageSizeChange(Number(event.currentTarget.value))
              }
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.filters}>
          <TaskFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
          />
        </div>
        {listErrorMessage ? (
          <div
            className={`${styles.feedback} ${styles.feedbackError}`}
            role="alert"
            aria-live="assertive"
          >
            {listErrorMessage}
          </div>
        ) : null}
        {isLoading ? (
          <div
            className={`${styles.feedback} ${styles.feedbackInfo}`}
            role="status"
            aria-live="polite"
          >
            Loading tasks…
          </div>
        ) : null}
        {isFetching && !isLoading ? (
          <div
            className={`${styles.feedback} ${styles.feedbackInfo}`}
            role="status"
            aria-live="polite"
          >
            Syncing latest updates…
          </div>
        ) : null}
      </div>
      <div className={styles.tableSection}>
        <TaskTable
          tasks={visibleTasks}
          sortBy={activeSort}
          sortOrder={filters.sortOrder}
          onRequestSort={handleSortRequest}
          onEdit={handleEditRequest}
          onDelete={handleDeleteTask}
          onChangeStatus={handleStatusChange}
        />
        <div className={styles.pagination}>
          <TaskPagination
            total={totalCount}
            page={filters.page}
            pageSize={filters.pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
      <Modal isOpen={isModalOpen} title={modalTitle} onClose={handleCloseModal}>
        {isModalOpen ? (
          <TaskForm
            key={`task-form-${formKey}`}
            mode={modalMode === 'edit' && activeTask ? 'edit' : 'create'}
            task={modalMode === 'edit' ? (activeTask ?? undefined) : undefined}
            submitting={
              modalMode === 'edit'
                ? updateTaskMutation.isPending
                : createTaskMutation.isPending
            }
            apiError={modalMode === 'edit' ? updateErrorMessage : createErrorMessage}
            onSubmit={(draft) => {
              if (modalMode === 'edit' && activeTask) {
                handleUpdateTask(activeTask, draft, {
                  onSuccess: (updated) => {
                    showToast({
                      type: 'success',
                      message: `Task "${updated.title}" updated`,
                    });
                  },
                });
              } else {
                handleCreateTask(draft);
              }
            }}
            onCancel={handleCloseModal}
          />
        ) : null}
      </Modal>
      <Modal
        isOpen={isDeleteModalOpen}
        title="Delete task"
        onClose={handleCloseDeleteModal}
        className={styles.deleteModal}
      >
        {pendingDeleteTask ? (
          <div className={styles.deleteContent}>
            <p className={styles.deleteMessage}>
              Are you sure you want to delete "{pendingDeleteTask.title}"? This action
              cannot be undone.
            </p>
            {deleteErrorMessage ? (
              <div className={styles.deleteError} role="alert" aria-live="assertive">
                {deleteErrorMessage}
              </div>
            ) : null}
            <div className={styles.deleteActions}>
              <button
                type="button"
                className={`${styles.deleteButton} ${styles.deleteButtonSecondary}`}
                onClick={handleCloseDeleteModal}
                disabled={deleteTaskMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.deleteButton} ${styles.deleteButtonDanger}`}
                onClick={handleConfirmDelete}
                disabled={deleteTaskMutation.isPending}
              >
                {deleteTaskMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
