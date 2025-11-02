import { TaskTableView } from '@/features/tasks/components/TaskTableView';
import { ToastProvider } from '@/app/providers/ToastProvider';
import styles from './App.module.css';

export const App = (): JSX.Element => (
  <div className={styles.page}>
    <header className={styles.pageHeader}>
      <h1 className={styles.title}>Task Tracker</h1>
      <p className={styles.subtitle}>
        Organise your work across Todo, Doing, and Done. Filter, sort, and manage tasks
        with optimistic updates against the backend API.
      </p>
    </header>
    <main className={styles.main}>
      <ToastProvider>
        <TaskTableView />
      </ToastProvider>
    </main>
  </div>
);
