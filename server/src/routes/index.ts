import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

// Health check endpoint
router.use('/', healthRoutes);

export default router;
