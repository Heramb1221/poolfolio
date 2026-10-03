import { Request, Response } from 'express';
import { env } from '../config/env';
import prisma from '../config/prisma';

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    message: isHealthy ? 'Poolfolio API is operational' : 'Poolfolio API service degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    version: '1.0.0',
    services: {
      database: dbStatus,
      accountingEngine: 'authoritative',
      aiPipeline: 'ready',
    },
  });
};

