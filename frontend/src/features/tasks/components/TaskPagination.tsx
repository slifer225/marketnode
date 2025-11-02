import styles from './TaskPagination.module.css';

export interface TaskPaginationProps {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
}

export const TaskPagination = ({
  total,
  page,
  pageSize,
  onPageChange,
}: TaskPaginationProps): JSX.Element => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(total, currentPage * pageSize);

  return (
    <nav className={styles.pagination} aria-label="Task pagination" role="navigation">
      <span className={styles.summary} aria-live="polite">
        Showing {total === 0 ? 0 : start} – {end} of {total}
      </span>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
};
