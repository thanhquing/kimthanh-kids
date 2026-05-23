export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly messageKey?: string;
  public readonly details?: Record<string, unknown>;

  constructor(args: {
    code: string;
    message: string;
    status: number;
    messageKey?: string;
    details?: Record<string, unknown>;
  }) {
    super(args.message);
    this.name = 'ApiClientError';
    this.code = args.code;
    this.status = args.status;
    this.messageKey = args.messageKey;
    this.details = args.details;
  }
}

export const isApiClientError = (err: unknown): err is ApiClientError =>
  err instanceof ApiClientError;
