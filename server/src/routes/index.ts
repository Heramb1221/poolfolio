import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import groupRoutes from './group.routes';
import investmentRoutes from './investment.routes';

const router = Router();

// Health check endpoint
router.use('/', healthRoutes);

// Authentication endpoints
router.use('/auth', authRoutes);

// Group management endpoints
router.use('/groups', groupRoutes);

// Investment management endpoints
router.use('/investments', investmentRoutes);

export default router;
