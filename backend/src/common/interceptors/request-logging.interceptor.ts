import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, url } = request;
    const startedAt = Date.now();

    // Centralized request logging keeps operational visibility lightweight.
    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - startedAt;
          const status = http.getResponse<Response>().statusCode;
          this.logger.log(`${method} ${url} ${status} +${elapsed}ms`);
        },
      }),
      catchError((err: unknown) => {
        const elapsed = Date.now() - startedAt;
        const status =
          err instanceof HttpException
            ? err.getStatus()
            : (http.getResponse<Response>().statusCode ?? 500);
        this.logger.error(
          `${method} ${url} ${status} +${elapsed}ms - ${this.extractErrorMessage(err)}`,
          err instanceof Error ? err.stack : undefined,
        );
        return throwError(() => err);
      }),
    );
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
}
