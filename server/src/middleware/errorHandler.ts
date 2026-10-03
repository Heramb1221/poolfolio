import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, NotFoundError } from '../utils/errors';
import { env } from '../config/env';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Handle invalid JSON body syntax errors
  if ('type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON payload received in request body',
      },
    });
    return;
  }

  // Unexpected errors
  // eslint-disable-next-line no-console
  console.error('Unhandled Server Error:', err);

  // Report to Sentry in production
  if (env.SENTRY_DSN) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Sentry } = require('../config/sentry');
      Sentry.captureException(err);
    } catch {
      // Ignore reporting error to prevent masking primary failure
    }
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
      ...(env.isDevelopment ? { details: err.message, stack: err.stack } : {}),
    },
  });
};
