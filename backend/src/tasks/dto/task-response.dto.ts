import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { TaskStatus } from '../task-status.enum';

@Exclude()
export class TaskResponseDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  status!: TaskStatus;

  @Expose()
  priority!: number;

  @Expose()
  @Transform(({ value }) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  })
  dueDate!: string | null;

  @Expose()
  tags!: string[];

  @Expose()
  version!: number;

  @Expose()
  createdAt!: string;

  @Expose()
  updatedAt!: string;
}

@Exclude()
export class TaskCollectionResponseDto {
  @Expose()
  @Type(() => TaskResponseDto)
  data!: TaskResponseDto[];

  @Expose()
  meta!: {
    total: number;
    page: number;
    pageSize: number;
    statusCounts: Record<TaskStatus, number>;
  };
}
