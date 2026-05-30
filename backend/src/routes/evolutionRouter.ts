import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { EvolutionController } from '../controllers/evolutionController.js';

const router = Router();

router.get(
  '/status',
  requireAuth,
  EvolutionController.getInstanceStatus
);

router.post(
  '/toggle-chatbot',
  requireAuth,
  EvolutionController.toggleChatbot
);

export default router;