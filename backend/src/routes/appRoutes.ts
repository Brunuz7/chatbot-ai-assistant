import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AppController } from '../controllers/appController.js';
import { EvolutionController } from '../controllers/evolutionController.js';
import { BlockedController } from '../controllers/blockedController.js';
import { InstructionController } from '../controllers/instructionController.js';
import { AgentController } from '../controllers/agentController.js';
import { FlowController } from '../controllers/flowController.js';


const router = Router();

// Agents
router.get('/agents', requireAuth, AgentController.list);
router.post('/agents', requireAuth, AgentController.create);
router.get('/agents/:id', requireAuth, AgentController.getById);
router.put('/agents/:id', requireAuth, AgentController.update);
router.delete('/agents/:id', requireAuth, AgentController.delete);

// Flows
router.get('/flows', requireAuth, FlowController.listAll);
router.get('/agents/:agentId/flows', requireAuth, FlowController.list);
router.post('/agents/:agentId/flows', requireAuth, FlowController.create);
router.put('/flows/:flowId', requireAuth, FlowController.update);
router.delete('/flows/:flowId', requireAuth, FlowController.delete);

// QR Code / Connect Instance
router.get('/instance/qrcode', requireAuth, EvolutionController.getQRCode);

// Dashboard Metrics
router.get('/metrics', requireAuth, EvolutionController.getMetrics);
router.get('/instance/status', requireAuth, EvolutionController.getInstanceStatus);

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

// User Instruction (global)
router.get('/instructions', requireAuth, InstructionController.getMine);
router.put('/instructions', requireAuth, InstructionController.upsertMine);


export default router;
