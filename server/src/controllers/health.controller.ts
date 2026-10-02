import { Request, Response } from 'express';
import { env } from '../config/env';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    message: 'Poolfolio API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
};
