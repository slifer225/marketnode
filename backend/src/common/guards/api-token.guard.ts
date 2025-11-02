import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  ProblemDetailsException,
  createProblemDetails,
} from '../problem-details';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedToken = this.configService.get<string>('API_TOKEN');
    if (!expectedToken) {
      throw new ProblemDetailsException(
        createProblemDetails(HttpStatus.UNAUTHORIZED, 'Unauthorized', {
          type: 'https://example.com/problems/misconfigured-auth',
          detail: 'API token is not configured on the server.',
        }),
      );
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ProblemDetailsException(
        createProblemDetails(HttpStatus.UNAUTHORIZED, 'Unauthorized', {
          type: 'https://example.com/problems/missing-token',
          detail: 'Missing bearer token.',
        }),
      );
    }

    const token = authHeader.substring('Bearer '.length).trim();
    if (token !== expectedToken) {
      throw new ProblemDetailsException(
        createProblemDetails(HttpStatus.UNAUTHORIZED, 'Unauthorized', {
          type: 'https://example.com/problems/invalid-token',
          detail: 'Invalid bearer token.',
        }),
      );
    }
    return true;
  }
}
