import { Router } from 'express';
import { register, login, googleAuth, me, logout } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authenticateToken as any, me as any);
router.post('/logout', logout);

export default router;
