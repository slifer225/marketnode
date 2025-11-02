import { ConfigService } from '@nestjs/config';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { SqljsConnectionOptions } from 'typeorm/driver/sqljs/SqljsConnectionOptions';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TaskTagEntity } from '../tasks/entities/task-tag.entity';

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const ensureParentDirectory = async (path: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
};

export const createSqlJsDataSourceOptions = async (
  configService: ConfigService,
): Promise<SqljsConnectionOptions> => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const synchronize =
    configService.get<boolean>('TYPEORM_SYNCHRONIZE') ??
    nodeEnv !== 'production';
  const databasePath = configService.get<string>(
    'DATABASE_PATH',
    'data/tasks.sqlite',
  );

  const isMemoryDatabase = databasePath === ':memory:';
  const resolvedPath = isMemoryDatabase ? undefined : resolve(databasePath);

  let existingData: Buffer | undefined;
  if (resolvedPath) {
    await ensureParentDirectory(resolvedPath);
    if (await fileExists(resolvedPath)) {
      existingData = await readFile(resolvedPath);
    }
  }

  return {
    type: 'sqljs',
    entities: [TaskEntity, TaskTagEntity],
    synchronize,
    location: resolvedPath,
    autoSave: Boolean(resolvedPath),
    autoSaveCallback: resolvedPath
      ? async (database: Uint8Array) => {
          await writeFile(resolvedPath, Buffer.from(database));
        }
      : undefined,
    ...(existingData ? { database: existingData } : {}),
  };
};
