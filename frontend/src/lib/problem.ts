import { z } from 'zod';

export const problemDetailsSchema = z.object({
  type: z.string().url().or(z.literal('about:blank')),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.record(z.array(z.string().min(1))).optional(),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export type TaskApiErrorDetail =
  | { readonly kind: 'network'; readonly error: Error }
  | { readonly kind: 'problem'; readonly problem: ProblemDetails }
  | { readonly kind: 'configuration'; readonly message: string }
  | { readonly kind: 'unexpected'; readonly error: Error };

const detailToMessage = (detail: TaskApiErrorDetail): string => {
  switch (detail.kind) {
    case 'network':
      return detail.error.message;
    case 'problem':
      return detail.problem.detail ?? detail.problem.title;
    case 'configuration':
      return detail.message;
    case 'unexpected':
      return detail.error.message;
  }
};

export class TaskApiError extends Error {
  readonly detail: TaskApiErrorDetail;

  constructor(detail: TaskApiErrorDetail) {
    super(detailToMessage(detail));
    this.name = 'TaskApiError';
    this.detail = detail;
  }
}

export const isProblemDetails = (value: unknown): value is ProblemDetails =>
  problemDetailsSchema.safeParse(value).success;

export const describeApiError = (detail: TaskApiErrorDetail): string =>
  detailToMessage(detail);
