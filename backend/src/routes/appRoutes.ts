import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AppController } from '../controllers/appController.js';
import { EvolutionController } from '../controllers/evolutionController.js';
import { BlockedController } from '../controllers/blockedController.js';

const router = Router();

// QR Code / Connect Instance
router.get('/instance/qrcode', requireAuth, EvolutionController.getQRCode);

// Dashboard Metrics
router.get('/metrics', requireAuth, EvolutionController.getMetrics);

// Chatbot Toggle
router.post('/instance/chatbot/toggle', requireAuth, EvolutionController.toggleChatbot);

// Webhook Handler
router.post('/webhook/evolution', EvolutionController.handleWebhook);

// Connections/Integrations
router.get('/connections', requireAuth, AppController.getConnections);

// Automations
router.get('/automations', requireAuth, AppController.getAutomations);

// Knowledge Base
router.get('/knowledge', requireAuth, AppController.getKnowledge);

// Contacts
router.get('/contacts', requireAuth, AppController.getContacts);

// Blocked Contacts
router.get('/blocked', requireAuth, BlockedController.list);
router.post('/blocked', requireAuth, BlockedController.block);
router.delete('/blocked/:id', requireAuth, BlockedController.unblock);

export default router;
