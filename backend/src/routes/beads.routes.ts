import { Router } from 'express';
import { BeadsController } from '../controllers/BeadsController';

const router = Router();
const beadsController = new BeadsController();

router.post('/sessions/:sessionId/import-beads', (req, res) => beadsController.importBeadsTasks(req, res));
router.get('/sessions/:sessionId/beads-tasks', (req, res) => beadsController.getBeadsTasks(req, res));

export { router as beadsRouter };
