import { Router } from 'express';
import { WorkItemController } from '../controllers/WorkItemController';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const workItemController = new WorkItemController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Work item CRUD operations
router.post('/', (req, res) => workItemController.create(req, res));
router.get('/', (req, res) => workItemController.list(req, res));
router.get('/stats', (req, res) => workItemController.getStats(req, res));
router.get('/:id', (req, res) => workItemController.get(req, res));
router.get('/:id/devmd', (req, res) => workItemController.getDevMd(req, res));
router.put('/:id', (req, res) => workItemController.update(req, res));
router.delete('/:id', (req, res) => workItemController.delete(req, res));

// Session association (this might be better in session routes, but included here for completeness)
router.put('/sessions/:sessionId/work-item', (req, res) => workItemController.associateSession(req, res));
router.delete('/sessions/:sessionId/work-item', (req, res) => workItemController.disassociateSession(req, res));

export { router as workItemRouter };