import { HttpException, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export const PROBLEM_JSON = 'application/problem+json';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export class ProblemDetailsException extends HttpException {
  constructor(problem: ProblemDetails) {
    super(problem, problem.status);
  }
}

export const createProblemDetails = (
  status: HttpStatus,
  title: string,
  overrides: Partial<Omit<ProblemDetails, 'status' | 'title'>> = {},
): ProblemDetails => ({
  type: overrides.type ?? `https://httpstatuses.com/${status}`,
  title,
  status,
  ...('detail' in overrides ? { detail: overrides.detail } : {}),
  ...('instance' in overrides ? { instance: overrides.instance } : {}),
  ...('errors' in overrides ? { errors: overrides.errors } : {}),
});

export const validationErrorsToProblem = (
  errors: ValidationError[],
): ProblemDetails => {
  const fieldErrors: Record<string, string[]> = {};
  for (const error of errors) {
    if (!error.constraints) {
      continue;
    }
    fieldErrors[error.property] = Object.values(error.constraints);
  }
  return createProblemDetails(HttpStatus.BAD_REQUEST, 'Validation failed', {
    type: 'https://example.com/problems/validation-error',
    errors: fieldErrors,
  });
};
