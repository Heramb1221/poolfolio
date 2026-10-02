import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtUserPayload {
  userId: string;
  email: string;
}

/**
 * Sign a JWT token for an authenticated user.
 */
export const signToken = (payload: JwtUserPayload, options?: SignOptions): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    ...options,
  });
};

/**
 * Verify a JWT token and extract the user payload.
 * Throws an error if invalid or expired.
 */
export const verifyToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtUserPayload;
};
