import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import authService from '../services/auth.service';

/**
 * Middleware to authenticate requests using JWT Bearer tokens.
 * Verifies token validity and attaches safe user identity to `req.user`.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token is required');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    if (!payload?.userId) {
      throw new UnauthorizedError('Invalid authentication token payload');
    }

    // Attach validated identity to request
    const user = await authService.getUserById(payload.userId);
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
