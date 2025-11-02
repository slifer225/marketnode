import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from '../entities/task.entity';
import { TaskStatus } from '../task-status.enum';
import type {
  ListTasksOptions,
  ListTasksResult,
  TaskRepository,
} from '../task.repository';

@Injectable()
export class TypeOrmTaskRepository implements TaskRepository {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repository: Repository<TaskEntity>,
  ) {}

  async create(task: TaskEntity): Promise<TaskEntity> {
    return this.repository.save(task);
  }

  async save(task: TaskEntity): Promise<TaskEntity> {
    return this.repository.save(task);
  }

  async findById(id: string): Promise<TaskEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async list(options: ListTasksOptions): Promise<ListTasksResult> {
    const qb = this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.tagEntities', 'tagEntities')
      .distinct(true);
    if (options.status) {
      qb.andWhere('task.status = :status', { status: options.status });
    }

    if (options.tag) {
      qb.andWhere('LOWER(tagEntities.value) = LOWER(:tag)', {
        tag: options.tag,
      });
    }

    if (options.search) {
      qb.andWhere('LOWER(task.title) LIKE :search', {
        search: `%${options.search.toLowerCase()}%`,
      });
    }

    const sortDirection = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
    if (options.sortBy === 'priority') {
      qb.orderBy('task.priority', sortDirection);
    } else if (options.sortBy === 'dueDate') {
      qb.orderBy('task.dueDate IS NULL', 'ASC').addOrderBy(
        'task.dueDate',
        sortDirection,
      );
    } else {
      qb.orderBy('task.createdAt', 'DESC');
    }

    qb.skip((options.page - 1) * options.pageSize).take(options.pageSize);

    const [data, total] = await qb.getManyAndCount();
    const statusCounts = await this.getStatusCounts();
    return {
      data,
      total,
      page: options.page,
      pageSize: options.pageSize,
      statusCounts,
    };
  }

  private async getStatusCounts(): Promise<Record<TaskStatus, number>> {
    const baseCounts: Record<TaskStatus, number> = {
      todo: 0,
      doing: 0,
      done: 0,
    };
    const rows = await this.repository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany<{ status: TaskStatus; count: string }>();
    for (const row of rows) {
      baseCounts[row.status] = Number.parseInt(row.count, 10);
    }
    return baseCounts;
  }
}
