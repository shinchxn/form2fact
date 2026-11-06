import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../errors/AppError.ts';

export interface RequestValidationSchemas {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export function validate(schemas: RequestValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }
      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          rule: issue.code
        }));
        next(AppError.badRequest(`Validation failed: ${issues.map((i) => `${i.field || 'payload'} (${i.message})`).join(', ')}`, 'VALIDATION_ERROR', issues));
      } else {
        next(err);
      }
    }
  };
}

