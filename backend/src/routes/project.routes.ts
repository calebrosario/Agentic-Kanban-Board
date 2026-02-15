import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';

const router = Router();
const controller = new ProjectController();

// Project CRUD operations
router.get('/', controller.getAllProjects);
router.get('/active', controller.getActiveProjects);
router.get('/:projectId', controller.getProjectById);
router.post('/', controller.createProject);
router.put('/:projectId', controller.updateProject);
router.delete('/:projectId', controller.deleteProject);

// Project statistics
router.get('/:projectId/stats', controller.getProjectStats);

// Session-Project associations
router.post('/sessions/:sessionId/projects/:projectId', controller.assignSessionToProject);
router.delete('/sessions/:sessionId/projects/:projectId', controller.removeSessionFromProject);
router.put('/sessions/:sessionId/projects', controller.updateSessionProjects);
router.get('/sessions/:sessionId/projects', controller.getProjectsBySessionId);
router.get('/:projectId/sessions', controller.getSessionsByProjectId);

export default router;