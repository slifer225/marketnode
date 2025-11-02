import type { FormEvent } from 'react';
import { isTaskStatus } from '../api/taskApi';
import type { TaskFiltersState } from '../state/taskFilters';
import styles from './TaskFilters.module.css';

export interface TaskFiltersProps {
  readonly filters: TaskFiltersState;
  readonly onFiltersChange: (filters: TaskFiltersState) => void;
  readonly onReset: () => void;
}

export const TaskFilters = ({
  filters,
  onFiltersChange,
  onReset,
}: TaskFiltersProps): JSX.Element => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="status-filter">
          Status
        </label>
        <select
          id="status-filter"
          className={styles.select}
          value={filters.status}
          onChange={(event) => {
            const value = event.currentTarget.value;
            onFiltersChange({
              ...filters,
              status: isTaskStatus(value) ? value : 'all',
              page: 1,
            });
          }}
        >
          <option value="all">All</option>
          <option value="todo">Todo</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="search-filter">
          Search
        </label>
        <input
          id="search-filter"
          className={styles.input}
          type="search"
          placeholder="Search title…"
          value={filters.search}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              search: event.currentTarget.value,
              page: 1,
            })
          }
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="tag-filter">
          Tag
        </label>
        <input
          id="tag-filter"
          className={styles.input}
          type="text"
          placeholder="Tag name"
          value={filters.tag}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              tag: event.currentTarget.value,
              page: 1,
            })
          }
        />
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </form>
  );
};
