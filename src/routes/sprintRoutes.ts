import { Router } from 'express';
import { getSprints, createSprint, updateSprint, getSprintBurndown } from '../controllers/sprintController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getSprints as any);
router.post('/', createSprint as any);
router.put('/:id', updateSprint as any);
router.get('/:id/burndown', getSprintBurndown as any);

export default router;
