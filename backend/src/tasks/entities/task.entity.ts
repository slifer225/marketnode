import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { TaskStatus } from '../task-status.enum';
import { TaskTagEntity } from './task-tag.entity';

@Entity({ name: 'tasks' })
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  title!: string;

  @Column({ type: 'text' })
  status!: TaskStatus;

  @Column({ type: 'integer' })
  priority!: number;

  @Column({ type: 'datetime', nullable: true })
  dueDate!: Date | null;

  @OneToMany(() => TaskTagEntity, (tag) => tag.task, {
    cascade: true,
    eager: true,
    orphanedRowAction: 'delete',
  })
  tagEntities!: TaskTagEntity[];

  @VersionColumn()
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
