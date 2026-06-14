import { Router } from 'express';
import { login, logout, refresh, register } from '../controllers/auth.controller';
import { loginSchema, registerSchema } from '../validators/auth.validators';
import { validateRequest } from '../middleware/validateRequest.middleware';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
