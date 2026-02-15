import { Router } from 'express';
import { TagController } from '../controllers/TagController';

const router = Router();
const controller = new TagController();

// Tag CRUD operations
router.get('/', controller.getAllTags);
router.get('/type/:type', controller.getTagsByType);
router.get('/popular', controller.getPopularTags);
router.get('/:tagId', controller.getTagById);
router.post('/', controller.createTag);
router.put('/:tagId', controller.updateTag);
router.delete('/:tagId', controller.deleteTag);

// Session-Tag associations
router.post('/sessions/:sessionId/tags/:tagId', controller.assignTagToSession);
router.delete('/sessions/:sessionId/tags/:tagId', controller.removeTagFromSession);
router.put('/sessions/:sessionId/tags', controller.updateSessionTags);
router.post('/sessions/:sessionId/tags/by-names', controller.assignTagsByNames);
router.get('/sessions/:sessionId/tags', controller.getTagsBySessionId);
router.get('/:tagId/sessions', controller.getSessionsByTagId);

export default router;