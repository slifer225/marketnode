import { useMemo } from 'react';
import clsx from 'clsx';
import { formatDateTime } from '@/lib/date';
import { isTaskExpired } from '../utils/taskPredicates';
import { EXPIRED_COLOR, getPriorityColor, hexToRgba } from '../utils/taskStyles';
import type { Task, TaskStatus, TaskSortOrder } from '../api/taskSchemas';
import { isTaskStatus } from '../api/taskApi';
import styles from './TaskTable.module.css';

type SortableColumn = 'priority' | 'dueDate';

const STATUS_OPTIONS: readonly { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'doing', label: 'Doing' },
  { value: 'done', label: 'Done' },
];

const formatDueDate = (dueDate: Date | null): string =>
  dueDate ? formatDateTime(dueDate) : 'No due date';

const getSortIndicator = (
  sortBy: SortableColumn | null,
  sortOrder: TaskSortOrder,
  column: SortableColumn,
): string => {
  if (sortBy !== column) {
    return '';
  }
  return sortOrder === 'asc' ? '▲' : '▼';
};

export interface TaskTableProps {
  readonly tasks: readonly Task[];
  readonly onEdit: (task: Task) => void;
  readonly onDelete: (task: Task) => void;
  readonly onChangeStatus: (task: Task, status: TaskStatus) => void;
  readonly sortBy: SortableColumn | null;
  readonly sortOrder: TaskSortOrder;
  readonly onRequestSort: (column: SortableColumn) => void;
}

export const TaskTable = ({
  tasks,
  onEdit,
  onDelete,
  onChangeStatus,
  sortBy,
  sortOrder,
  onRequestSort,
}: TaskTableProps): JSX.Element => {
  const rows = useMemo(
    () =>
      tasks.map((task) => {
        const expired = isTaskExpired(task);
        const accentColor = expired ? EXPIRED_COLOR : getPriorityColor(task.priority);
        const backgroundColor = hexToRgba(accentColor, expired ? 0.25 : 0.12);
        return {
          task,
          expired,
          accentColor,
          backgroundColor,
        };
      }),
    [tasks],
  );

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th scope="col" className={styles.headerCell}>
              Title
            </th>
            <th scope="col" className={styles.headerCell}>
              Status
            </th>
            <th
              scope="col"
              className={clsx(styles.headerCell, {
                [styles.sortedHeader]: sortBy === 'priority',
              })}
              aria-sort={
                sortBy === 'priority'
                  ? sortOrder === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className={styles.headerButton}
                onClick={() => onRequestSort('priority')}
              >
                <span>Priority</span>
                <span className={styles.sortIndicator}>
                  {getSortIndicator(sortBy, sortOrder, 'priority')}
                </span>
              </button>
            </th>
            <th
              scope="col"
              className={clsx(styles.headerCell, {
                [styles.sortedHeader]: sortBy === 'dueDate',
              })}
              aria-sort={
                sortBy === 'dueDate'
                  ? sortOrder === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className={styles.headerButton}
                onClick={() => onRequestSort('dueDate')}
              >
                <span>Due date</span>
                <span className={styles.sortIndicator}>
                  {getSortIndicator(sortBy, sortOrder, 'dueDate')}
                </span>
              </button>
            </th>
            <th scope="col" className={styles.headerCell}>
              Tags
            </th>
            <th scope="col" className={styles.headerCell}>
              Updated
            </th>
            <th scope="col" className={styles.headerCell}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ task, expired, accentColor, backgroundColor }) => (
            <tr
              key={task.id}
              className={styles.row}
              style={{
                borderLeft: `0.4rem solid ${accentColor}`,
                backgroundColor,
              }}
            >
              <td className={styles.cell}>
                <div>
                  <strong>{task.title}</strong>
                </div>
                {expired ? (
                  <div className={styles.expiredCell} role="status" aria-live="polite">
                    ⚠️ Expired
                  </div>
                ) : null}
              </td>
              <td className={styles.cell}>
                <select
                  className={styles.statusSelect}
                  value={task.status}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (isTaskStatus(value) && value !== task.status) {
                      onChangeStatus(task, value);
                    }
                  }}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className={styles.cell}>
                <span
                  className={styles.priorityBadge}
                  aria-label={`Priority ${task.priority}`}
                >
                  P{task.priority}
                </span>
              </td>
              <td className={styles.cell}>
                <span className={clsx({ [styles.noDueDate]: !task.dueDate })}>
                  {formatDueDate(task.dueDate)}
                </span>
              </td>
              <td className={styles.cell}>
                {task.tags.length > 0 ? (
                  <div className={styles.tagList}>
                    {task.tags.map((tag) => (
                      <span key={tag} className={styles.tagChip}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span>—</span>
                )}
              </td>
              <td className={styles.cell}>{formatDateTime(task.updatedAt)}</td>
              <td className={styles.cell}>
                <div className={styles.actionGroup}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => onEdit(task)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={clsx(styles.actionButton, styles.deleteAction)}
                    onClick={() => onDelete(task)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
