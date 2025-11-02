import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import appConfig from './config/app.config';
import { createSqlJsDataSourceOptions } from './config/sqljs.config';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().port().default(3000),
        API_TOKEN: Joi.string().required(),
        DATABASE_PATH: Joi.string().default('data/tasks.sqlite'),
        TYPEORM_SYNCHRONIZE: Joi.boolean()
          .truthy('true', '1')
          .falsy('false', '0')
          .optional(),
        CORS_ORIGINS: Joi.string().optional(),
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createSqlJsDataSourceOptions(configService),
    }),
    TasksModule,
  ],
})
export class AppModule {}
