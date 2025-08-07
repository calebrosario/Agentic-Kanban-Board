import { Router } from 'express';
import { WorkflowStageController } from '../controllers/WorkflowStageController';

const router = Router();
const controller = new WorkflowStageController();

// GET /api/workflow-stages - Get all workflow stages
router.get('/', controller.getAllStages);

// GET /api/workflow-stages/:id - Get a specific stage
router.get('/:id', controller.getStage);

// POST /api/workflow-stages - Create a new workflow stage
router.post('/', controller.createStage);

// PUT /api/workflow-stages/:id - Update a workflow stage
router.put('/:id', controller.updateStage);

// DELETE /api/workflow-stages/:id - Delete a workflow stage
router.delete('/:id', controller.deleteStage);

// POST /api/workflow-stages/reorder - Reorder stages
router.post('/reorder', controller.reorderStages);

// POST /api/workflow-stages/initialize - Initialize default stages
router.post('/initialize', controller.initializeDefaults);

export default router;