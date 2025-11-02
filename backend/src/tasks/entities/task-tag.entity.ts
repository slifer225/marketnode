import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TaskEntity } from './task.entity';

@Entity({ name: 'task_tags' })
@Unique(['task', 'value'])
export class TaskTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 30 })
  value!: string;

  @ManyToOne(() => TaskEntity, (task) => task.tagEntities, {
    onDelete: 'CASCADE',
  })
  task!: TaskEntity;
}
