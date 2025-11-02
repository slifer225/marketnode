import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  apiToken: string;
  databasePath: string;
  corsOrigins: readonly string[];
}

const parseCorsOrigins = (value: string | undefined): readonly string[] => {
  if (!value) {
    return ['http://localhost:5173'];
  }
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return origins.length > 0 ? origins : ['http://localhost:5173'];
};

export default registerAs(
  'app',
  (): AppConfig => ({
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    apiToken: process.env.API_TOKEN ?? '',
    databasePath: process.env.DATABASE_PATH ?? 'data/tasks.sqlite',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  }),
);
