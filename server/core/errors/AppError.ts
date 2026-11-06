export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(message: string, code: string = 'BAD_REQUEST', details?: unknown): AppError {
    return new AppError(message, 400, code, details);
  }

  public static unauthorized(message: string = 'Authentication required', code: string = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  public static forbidden(message: string = 'Access denied', code: string = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  public static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  public static conflict(message: string, code: string = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  public static unprocessable(message: string, code: string = 'UNPROCESSABLE_ENTITY', details?: unknown): AppError {
    return new AppError(message, 422, code, details);
  }
}

