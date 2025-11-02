import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTokenGuard } from '../common/guards/api-token.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import {
  TaskCollectionResponseDto,
  TaskResponseDto,
} from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(ApiTokenGuard)
  create(@Body() dto: CreateTaskDto): Promise<TaskResponseDto> {
    this.logger.log('Creating a new task', dto);
    return this.tasksService.createTask(dto);
  }

  @Get()
  list(@Query() query: ListTasksQueryDto): Promise<TaskCollectionResponseDto> {
    return this.tasksService.listTasks(query);
  }

  @Patch(':id')
  @UseGuards(ApiTokenGuard)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.updateTask(id, dto);
  }

  @Delete(':id')
  @UseGuards(ApiTokenGuard)
  @HttpCode(204)
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.tasksService.deleteTask(id);
  }
}
