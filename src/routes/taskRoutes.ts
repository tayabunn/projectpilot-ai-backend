import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask, getAIRecommendations } from '../controllers/taskController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getTasks as any);
router.post('/', createTask as any);
router.put('/:id', updateTask as any);
router.delete('/:id', deleteTask as any);
router.post('/recommendations', getAIRecommendations as any);

export default router;
