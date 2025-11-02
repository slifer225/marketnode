import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { TaskEntity } from './entities/task.entity';
import { TaskTagEntity } from './entities/task-tag.entity';
import { TypeOrmTaskRepository } from './infrastructure/typeorm-task.repository';
import { TASK_REPOSITORY } from './task.repository';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, TaskTagEntity])],
  controllers: [TasksController],
  providers: [
    TasksService,
    TypeOrmTaskRepository,
    ApiTokenGuard,
    {
      provide: TASK_REPOSITORY,
      useExisting: TypeOrmTaskRepository,
    },
  ],
})
export class TasksModule {}
