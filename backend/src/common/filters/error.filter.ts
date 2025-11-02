import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  PROBLEM_JSON,
  ProblemDetailsException,
  createProblemDetails,
} from '../problem-details';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ProblemDetailsException) {
      this.respond(response, exception.getResponse(), exception.getStatus());
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload =
        typeof exception.getResponse() === 'object'
          ? exception.getResponse()
          : createProblemDetails(status, exception.message, {
              detail: exception.message,
            });
      this.respond(response, payload, status);
      return;
    }

    this.logger.error(
      `Unhandled exception for ${request.method} ${request.url}`,
      (exception as Error)?.stack,
    );
    const payload = createProblemDetails(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal Server Error',
      {
        detail: 'An unexpected error occurred.',
        type: 'https://example.com/problems/internal-server-error',
      },
    );
    this.respond(response, payload, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private respond(response: Response, payload: unknown, status: number): void {
    response.status(status).type(PROBLEM_JSON).json(payload);
  }
}
