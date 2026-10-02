import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';

const router = Router();

// Health check endpoint
router.use('/', healthRoutes);

// Authentication endpoints
router.use('/auth', authRoutes);

export default router;
