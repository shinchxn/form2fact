import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError.ts';
import { logger } from '../logger/index.ts';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const errorCode = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? err.message : (process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message);

  logger.error('API Error caught by centralized error handler', {
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode,
    errorCode,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code: errorCode,
    ...(isAppError && err.details ? { details: err.details } : {})
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl || req.url} - Endpoint not found`,
    code: 'ROUTE_NOT_FOUND'
  });
}

