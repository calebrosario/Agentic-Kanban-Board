import { Router } from 'express';
import { CommonPathController } from '../controllers/CommonPathController';

const router = Router();
const controller = new CommonPathController();

// GET /api/common-paths - Get all common paths
router.get('/', controller.getAllPaths);

// GET /api/common-paths/:id - Get a specific path
router.get('/:id', controller.getPath);

// POST /api/common-paths - Create a new common path
router.post('/', controller.createPath);

// PUT /api/common-paths/:id - Update a common path
router.put('/:id', controller.updatePath);

// DELETE /api/common-paths/:id - Delete a common path
router.delete('/:id', controller.deletePath);

// POST /api/common-paths/reorder - Reorder paths
router.post('/reorder', controller.reorderPaths);

// POST /api/common-paths/reset - Reset to default paths
router.post('/reset', controller.resetToDefault);

export default router;