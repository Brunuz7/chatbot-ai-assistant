import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AppController } from '../controllers/appController.js';
import { EvolutionController } from '../controllers/evolutionController.js';
import { InstructionController } from '../controllers/instructionController.js';
import { AgentController } from '../controllers/agentController.js';
import { FlowController } from '../controllers/flowController.js';
import { BlockedController } from '../controllers/blockedController.js';
import { UserContactController } from '../controllers/userContactController.js';
import { KnowledgeController } from '../controllers/knowledgeController.js';
import { ConversationController } from '../controllers/conversationController.js';
import { LeadTagController } from '../controllers/leadTagController.js';
import { UserSettingController } from '../controllers/userSettingController.js';
import { BulkMessageController } from '../controllers/bulkMessageController.js';

const router = Router();

// Agents
router.get('/agents', requireAuth, AgentController.list);
router.post('/agents', requireAuth, AgentController.create);
// Rotas mais específicas antes de /agents/:id (Express 5 / path-to-regexp)
router.get('/agents/:agentId/flows', requireAuth, FlowController.list);
router.post('/agents/:agentId/flows', requireAuth, FlowController.create);
router.get('/agents/:id', requireAuth, AgentController.getById);
router.put('/agents/:id', requireAuth, AgentController.update);
router.delete('/agents/:id', requireAuth, AgentController.delete);

// Flows
router.get('/flows', requireAuth, FlowController.listAll);
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

// Knowledge Base (por conta: CRUD + IA usa trechos relevantes por consulta)
router.get('/knowledge', requireAuth, KnowledgeController.list);
router.post('/knowledge', requireAuth, KnowledgeController.create);
router.put('/knowledge/:id', requireAuth, KnowledgeController.update);
router.delete('/knowledge/:id', requireAuth, KnowledgeController.remove);

// Conversas (tabela conversation)
router.get('/conversations', requireAuth, ConversationController.list);
router.get('/conversations/:id', requireAuth, ConversationController.getById);

// User contacts (user_contact)
router.get('/contacts/blocked', requireAuth, UserContactController.getBlockedContacts);
router.post('/contacts', requireAuth, UserContactController.createContact);
router.get('/contacts', requireAuth, UserContactController.getContacts);
router.put('/contacts/:id', requireAuth, UserContactController.updateContact);
router.delete('/contacts/:id', requireAuth, UserContactController.deleteContact);
router.patch('/contacts/:id/block', requireAuth, UserContactController.blockContact);
router.patch('/contacts/:id/unblock', requireAuth, UserContactController.unblockContact);

// Blocked Contacts
router.get('/blocked', requireAuth, BlockedController.list);
router.post('/blocked', requireAuth, BlockedController.block);
router.delete('/blocked/:id', requireAuth, BlockedController.unblock);

// User Instruction (global)
router.get('/instructions', requireAuth, InstructionController.getMine);
router.put('/instructions', requireAuth, InstructionController.upsertMine);

// Configurações da conta
router.get('/settings', requireAuth, UserSettingController.getMine);
router.patch('/settings/lead-qualification', requireAuth, UserSettingController.updateLeadQualification);
router.patch('/settings/tts-reply', requireAuth, UserSettingController.updateTtsReply);
router.get('/settings/voice-clone', requireAuth, UserSettingController.getVoiceCloneStatus);
router.post('/settings/voice-clone', requireAuth, UserSettingController.uploadVoiceClone);
router.delete('/settings/voice-clone', requireAuth, UserSettingController.deleteVoiceClone);

// Envio em massa / programado
router.get('/bulk-messages/limits', requireAuth, BulkMessageController.limits);
router.get('/bulk-messages', requireAuth, BulkMessageController.list);
router.post('/bulk-messages', requireAuth, BulkMessageController.create);
router.get('/bulk-messages/:id', requireAuth, BulkMessageController.getById);
router.post('/bulk-messages/:id/cancel', requireAuth, BulkMessageController.cancel);
router.post('/bulk-messages/:id/pause', requireAuth, BulkMessageController.pause);
router.post('/bulk-messages/:id/resume', requireAuth, BulkMessageController.resume);

// Tags de qualificação de leads
router.get('/lead-tags', requireAuth, LeadTagController.list);
router.post('/lead-tags', requireAuth, LeadTagController.create);
router.put('/lead-tags/:id', requireAuth, LeadTagController.update);
router.delete('/lead-tags/:id', requireAuth, LeadTagController.remove);

export default router;
