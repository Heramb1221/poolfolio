import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { registerSchema, loginSchema } from '../middleware/auth.validation';

const router = Router();

// Public auth endpoints
router.post('/register', validateRequest({ body: registerSchema }), register);
router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/logout', logout);

// Protected auth endpoints
router.get('/me', authenticate, getMe);

export default router;
