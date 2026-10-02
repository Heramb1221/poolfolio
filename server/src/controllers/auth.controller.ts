import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import authService from '../services/auth.service';
import { UnauthorizedError } from '../utils/errors';

/**
 * Register a new user account.
 * Route: POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * Log into an existing user account.
 * Route: POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Log out of user account.
 * In a stateless JWT architecture, the client discards the token.
 * Route: POST /api/auth/logout
 */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Get profile information for currently authenticated user.
 * Route: GET /api/auth/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});
