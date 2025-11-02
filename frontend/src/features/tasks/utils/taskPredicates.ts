import type { Task } from '../api/taskSchemas';

export const isTaskExpired = (task: Task, reference = new Date()): boolean => {
  if (task.status === 'done') {
    return false;
  }
  if (!task.dueDate) {
    return false;
  }
  return task.dueDate.getTime() < reference.getTime();
};
