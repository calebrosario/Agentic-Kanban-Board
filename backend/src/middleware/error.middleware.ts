import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../services/SessionService';
import { logger } from '../utils/logger';
import { getEnvConfig } from '../config/env.config';

export interface HttpError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  error: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred:', error);
  
  // Default error response
  let statusCode = error.statusCode || 500;
  let errorCode = error.code || 'INTERNAL_ERROR';
  let errorMessage = error.message || 'An unexpected error occurred';
  
  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (error.message.includes('unauthorized')) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  } else if (error.message.includes('forbidden')) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  }
  
  // Send error response
  res.status(statusCode).json({
    error_code: errorCode,
    error_message: errorMessage,
    ...(getEnvConfig().nodeEnv === 'development' && { stack: error.stack })
  });
}