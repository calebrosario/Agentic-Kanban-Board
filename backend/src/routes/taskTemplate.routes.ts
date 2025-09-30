import { Router } from 'express';
import { TaskTemplateController } from '../controllers/TaskTemplateController';

const router = Router();
const controller = new TaskTemplateController();

// GET /api/task-templates - Get all task templates
router.get('/', controller.getAllTemplates);

// GET /api/task-templates/:id - Get a specific template
router.get('/:id', controller.getTemplate);

// POST /api/task-templates - Create a new task template
router.post('/', controller.createTemplate);

// PUT /api/task-templates/:id - Update a task template
router.put('/:id', controller.updateTemplate);

// DELETE /api/task-templates/:id - Delete a task template
router.delete('/:id', controller.deleteTemplate);

// POST /api/task-templates/reorder - Reorder templates
router.post('/reorder', controller.reorderTemplates);

// POST /api/task-templates/reset - Reset to default templates
router.post('/reset', controller.resetToDefault);

export default router;