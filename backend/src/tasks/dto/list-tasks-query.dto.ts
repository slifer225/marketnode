import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { TaskStatus } from '../task-status.enum';

export type TaskSortBy = 'priority' | 'dueDate';
export type TaskSortOrder = 'asc' | 'desc';

export class ListTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  tag?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  @IsOptional()
  @IsIn(['priority', 'dueDate'])
  sortBy?: TaskSortBy;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: TaskSortOrder = 'asc';

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 1;
    }
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? 1 : parsed;
  })
  @IsInt()
  @Min(1)
  page: number = 1;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 25;
    }
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed)) {
      return 25;
    }
    return parsed;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;
}
