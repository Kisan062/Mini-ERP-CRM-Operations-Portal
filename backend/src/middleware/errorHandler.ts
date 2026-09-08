import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { ENV } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Handled AppError (Custom Operational Errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: 'Input validation failed',
        code: 'VALIDATION_ERROR',
        details: formattedErrors,
      },
    });
    return;
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        res.status(409).json({
          success: false,
          error: {
            message: `A record with this ${target} already exists.`,
            code: 'UNIQUE_CONSTRAINT_FAILED',
          },
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          success: false,
          error: {
            message: (err.meta?.cause as string) || 'Record not found.',
            code: 'NOT_FOUND',
          },
        });
        return;
      }
      case 'P2003': {
        res.status(400).json({
          success: false,
          error: {
            message: 'Referenced foreign key entity does not exist.',
            code: 'FOREIGN_KEY_VIOLATION',
          },
        });
        return;
      }
      default:
        res.status(400).json({
          success: false,
          error: {
            message: 'Database operation error.',
            code: err.code,
            details: err.meta,
          },
        });
        return;
    }
  }

  // 4. Fallback for unhandled / internal errors
  console.error('[UNHANDLED_ERROR]:', err);

  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      ...(ENV.NODE_ENV === 'development' ? { stack: err.stack, raw: err.message } : {}),
    },
  });
};
