import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { fromInputDate, toInputDate } from '@/lib/date';
import type { Task, TaskDraft, TaskStatus } from '../api/taskSchemas';
import { taskDraftSchema } from '../api/taskSchemas';
import styles from './TaskForm.module.css';

interface TaskFormState {
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: number;
  readonly dueDate: string;
  readonly tags: string[];
  readonly tagInput: string;
}

type FieldError = Partial<
  Record<'title' | 'status' | 'priority' | 'dueDate' | 'tags', string>
>;

const createInitialState = (task?: Task): TaskFormState => ({
  title: task?.title ?? '',
  status: task?.status ?? 'todo',
  priority: task?.priority ?? 3,
  dueDate: toInputDate(task?.dueDate ?? null),
  tags: task ? [...task.tags] : [],
  tagInput: '',
});

export interface TaskFormProps {
  readonly mode: 'create' | 'edit';
  readonly task?: Task | undefined;
  readonly submitting: boolean;
  readonly apiError?: string | undefined;
  readonly onSubmit: (draft: TaskDraft) => void;
  readonly onCancel?: (() => void) | undefined;
}

export const TaskForm = ({
  mode,
  task,
  submitting,
  apiError,
  onSubmit,
  onCancel,
}: TaskFormProps): JSX.Element => {
  const [state, setState] = useState<TaskFormState>(() => createInitialState(task));
  const [errors, setErrors] = useState<FieldError>({});

  useEffect(() => {
    setState(createInitialState(task));
    setErrors({});
  }, [task, mode]);

  const todayInputValue = useMemo(() => toInputDate(new Date()), []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const dueDateIso = fromInputDate(state.dueDate);
    const tags = state.tags;
    const statusValue: TaskStatus = mode === 'create' ? 'todo' : state.status;

    const draftResult = taskDraftSchema.safeParse({
      title: state.title,
      status: statusValue,
      priority: state.priority,
      dueDate: dueDateIso,
      tags,
    });

    if (!draftResult.success) {
      const fieldErrors: FieldError = {};
      const flattened = draftResult.error.flatten();
      if (flattened.fieldErrors.title?.length) {
        fieldErrors.title = flattened.fieldErrors.title[0];
      }
      if (flattened.fieldErrors.status?.length) {
        fieldErrors.status = flattened.fieldErrors.status[0];
      }
      if (flattened.fieldErrors.priority?.length) {
        fieldErrors.priority = flattened.fieldErrors.priority[0];
      }
      if (flattened.fieldErrors.dueDate?.length) {
        fieldErrors.dueDate = flattened.fieldErrors.dueDate[0];
      }
      if (flattened.fieldErrors.tags?.length) {
        fieldErrors.tags = flattened.fieldErrors.tags[0];
      }
      setErrors(fieldErrors);
      return;
    }

    onSubmit(draftResult.data);
  };

  const disabled = submitting;
  const effectiveMinDate =
    mode === 'edit' && state.dueDate && state.dueDate < todayInputValue
      ? state.dueDate
      : todayInputValue;

  const statusOptions = useMemo(
    () => [
      { value: 'todo', label: 'Todo' },
      { value: 'doing', label: 'Doing' },
      { value: 'done', label: 'Done' },
    ],
    [],
  );

  const addTag = (rawValue: string) => {
    const candidate = rawValue.trim();
    if (candidate.length === 0) {
      setState((prev) => ({ ...prev, tagInput: '' }));
      return;
    }
    setState((prev) => {
      const exists = prev.tags.some(
        (tag) => tag.toLocaleLowerCase() === candidate.toLocaleLowerCase(),
      );
      if (exists || prev.tags.length >= 20) {
        return { ...prev, tagInput: '' };
      }
      return { ...prev, tags: [...prev.tags, candidate], tagInput: '' };
    });
    setErrors((prev) => {
      if (!('tags' in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next.tags;
      return next;
    });
  };

  const removeTag = (tagToRemove: string) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
    setErrors((prev) => {
      if (!('tags' in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next.tags;
      return next;
    });
  };

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Space') {
      event.preventDefault();
      addTag(state.tagInput);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      addTag(state.tagInput);
    } else if (event.key === 'Backspace' && state.tagInput.length === 0) {
      event.preventDefault();
      setState((prev) => {
        if (prev.tags.length === 0) {
          return prev;
        }
        const nextTags = [...prev.tags];
        nextTags.pop();
        return { ...prev, tags: nextTags };
      });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {mode === 'edit' && task ? (
        <p className={styles.helper} aria-live="polite">
          Editing version {task.version}. Updates are optimistic and will refetch on
          conflict.
        </p>
      ) : null}
      {apiError ? (
        <div className={styles.formError} role="alert" aria-live="assertive">
          {apiError}
        </div>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-title">
          Title
        </label>
        <input
          id="task-title"
          className={styles.input}
          type="text"
          autoComplete="off"
          value={state.title}
          onChange={(event) => setState({ ...state, title: event.currentTarget.value })}
          aria-invalid={Boolean(errors.title)}
          required
          disabled={disabled}
        />
        {errors.title ? (
          <span className={styles.error} role="alert">
            {errors.title}
          </span>
        ) : null}
      </div>
      {mode === 'edit' ? (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="task-status">
            Status
          </label>
          <select
            id="task-status"
            className={styles.select}
            value={state.status}
            onChange={(event) =>
              setState({
                ...state,
                status: event.currentTarget.value as TaskFormState['status'],
              })
            }
            aria-invalid={Boolean(errors.status)}
            disabled
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.status ? (
            <span className={styles.error} role="alert">
              {errors.status}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={styles.field}>
        <div className={styles.rangeHeader}>
          <label className={styles.label} htmlFor="task-priority">
            Priority
          </label>
          <span className={styles.rangeValue} aria-live="polite">
            P{state.priority}
          </span>
        </div>
        <input
          id="task-priority"
          className={styles.range}
          type="range"
          min={1}
          max={5}
          step={1}
          value={state.priority}
          onChange={(event) =>
            setState({
              ...state,
              priority: Number.parseInt(event.currentTarget.value, 10),
            })
          }
          aria-invalid={Boolean(errors.priority)}
          disabled={disabled}
        />
        {errors.priority ? (
          <span className={styles.error} role="alert">
            {errors.priority}
          </span>
        ) : null}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-due-date">
          Due date
        </label>
        <input
          id="task-due-date"
          className={styles.input}
          type="date"
          value={state.dueDate}
          min={effectiveMinDate}
          onChange={(event) => setState({ ...state, dueDate: event.currentTarget.value })}
          aria-invalid={Boolean(errors.dueDate)}
          disabled={disabled}
        />
        <span className={styles.helper}>
          Leave blank if the task has no deadline. Dates before today are disabled.
        </span>
        {errors.dueDate ? (
          <span className={styles.error} role="alert">
            {errors.dueDate}
          </span>
        ) : null}
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-tag-input">
          Tags
        </label>
        <div className={styles.tagInputContainer}>
          {state.tags.map((tag) => (
            <span key={tag} className={styles.tagChip}>
              {tag}
              <button
                type="button"
                className={styles.tagChipRemove}
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                disabled={disabled}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            id="task-tag-input"
            className={styles.tagInput}
            value={state.tagInput}
            onChange={(event) =>
              setState({ ...state, tagInput: event.currentTarget.value })
            }
            onKeyDown={handleTagInputKeyDown}
            disabled={disabled}
            placeholder={
              state.tags.length === 0 ? 'Add a tag and press space' : undefined
            }
            aria-invalid={Boolean(errors.tags)}
          />
        </div>
        <span className={styles.helper}>
          Type a tag and press space to add it. Max 20 tags.
        </span>
        {errors.tags ? (
          <span className={styles.error} role="alert">
            {errors.tags}
          </span>
        ) : null}
      </div>
      <div className={styles.actions}>
        {onCancel ? (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={disabled}
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create task' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};
