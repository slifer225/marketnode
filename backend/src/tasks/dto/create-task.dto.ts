import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TaskStatus } from '../task-status.enum';

export class CreateTaskDto {
  @IsString()
  @Length(1, 120)
  @Matches(/\S/, { message: 'title must contain a non-whitespace character' })
  title!: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  priority?: number;

  @IsOptional()
  @IsISO8601()
  dueDate?: string | null;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.map((tag) => String(tag));
    }
    if (typeof value === 'string' && value.length) {
      return [value];
    }
    return undefined;
  })
  @IsOptional()
  tags?: string[];
}
