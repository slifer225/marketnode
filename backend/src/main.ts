import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ErrorFilter } from './common/filters/error.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import {
  ProblemDetailsException,
  validationErrorsToProblem,
} from './common/problem-details';
import type { AppConfig } from './config/app.config';

type AppConfigNamespace = {
  app: AppConfig;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:5173'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new ProblemDetailsException(validationErrorsToProblem(errors)),
    }),
  );
  app.useGlobalFilters(new ErrorFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  const configService =
    app.get<ConfigService<AppConfigNamespace, true>>(ConfigService);
  const { port } = configService.getOrThrow<AppConfig>('app');
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}
bootstrap().catch((err) => {
  const error = err instanceof Error ? err : new Error(String(err));
  Logger.error('Failed to start Nest application', error.stack, 'Bootstrap');
  process.exit(1);
});
