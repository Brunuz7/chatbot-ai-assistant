import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireLicense } from '../middleware/license.js';
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
import { WhatsAppOfficialController } from '../controllers/whatsappOfficialController.js';
import { ConnectionController } from '../controllers/connectionController.js';
import { WebhookController } from '../controllers/webhookController.js';

const router = Router();

// ─── Shorthand: auth + licença ────────────────────────────────────────────
// Aplicar em todas as rotas de negócio (agents, flows, contacts, etc.)
// Webhooks e auth ficam fora — são chamados por serviços externos ou pelo login.
const authAndLicense = [requireAuth, requireLicense];

// ─── Agents ───────────────────────────────────────────────────────────────
router.get('/agents', ...authAndLicense, AgentController.list);
router.post('/agents', ...authAndLicense, AgentController.create);
// Rotas mais específicas antes de /agents/:id (Express 5 / path-to-regexp)
router.get('/agents/:agentId/flows', ...authAndLicense, FlowController.list);
router.post('/agents/:agentId/flows', ...authAndLicense, FlowController.createForAgent);
router.post('/flows', ...authAndLicense, FlowController.create);
router.get('/agents/:id', ...authAndLicense, AgentController.getById);
router.put('/agents/:id', ...authAndLicense, AgentController.update);
router.delete('/agents/:id', ...authAndLicense, AgentController.delete);

// ─── Flows ─────────────────────────────────────────────────────────────────
router.get('/flows', ...authAndLicense, FlowController.listAll);
router.put('/flows/:flowId', ...authAndLicense, FlowController.update);
router.delete('/flows/:flowId', ...authAndLicense, FlowController.delete);

// ─── Instância / QR Code ──────────────────────────────────────────────────
router.get('/instance/qrcode', ...authAndLicense, EvolutionController.getQRCode);

// ─── Dashboard Metrics ────────────────────────────────────────────────────
router.get('/metrics', ...authAndLicense, EvolutionController.getMetrics);
router.get('/instance/status', ...authAndLicense, EvolutionController.getInstanceStatus);

// ─── Chatbot Toggle ───────────────────────────────────────────────────────
router.post('/instance/chatbot/toggle', ...authAndLicense, EvolutionController.toggleChatbot);

// ─── Canal WhatsApp (Evolution vs Oficial) ───────────────────────────────
router.get('/connection/overview', ...authAndLicense, ConnectionController.getOverview);
router.patch('/connection/channel', ...authAndLicense, ConnectionController.setChannel);
router.post('/connection/chatbot/toggle', ...authAndLicense, ConnectionController.toggleChatbot);

// ─── WhatsApp Oficial (Cloud API — cadastro incorporado Meta) ────────────
router.get('/whatsapp-official/status', ...authAndLicense, WhatsAppOfficialController.getStatus);
router.get(
  '/whatsapp-official/embedded-signup/config',
  ...authAndLicense,
  WhatsAppOfficialController.getEmbeddedSignupConfig,
);
router.post(
  '/whatsapp-official/embedded-signup/complete',
  ...authAndLicense,
  WhatsAppOfficialController.completeEmbeddedSignup,
);
router.post('/whatsapp-official/disconnect', ...authAndLicense, WhatsAppOfficialController.disconnect);

// ─── Webhooks (SEM auth nem licença — chamados por Evolution ou Meta) ────
router.post('/webhook/evolution', WebhookController.handleEvolution);
router.get('/webhook/whatsapp-official', WebhookController.verifyOfficial);
router.post('/webhook/whatsapp-official', WebhookController.handleOfficial);

// ─── Connections / Integrations ───────────────────────────────────────────
router.get('/connections', ...authAndLicense, AppController.getConnections);

// ─── Automações ───────────────────────────────────────────────────────────
router.get('/automations', ...authAndLicense, AppController.getAutomations);

// ─── Knowledge Base ───────────────────────────────────────────────────────
router.get('/knowledge', ...authAndLicense, KnowledgeController.list);
router.post('/knowledge', ...authAndLicense, KnowledgeController.create);
router.put('/knowledge/:id', ...authAndLicense, KnowledgeController.update);
router.delete('/knowledge/:id', ...authAndLicense, KnowledgeController.remove);

// ─── Conversas ────────────────────────────────────────────────────────────
router.get('/conversations', ...authAndLicense, ConversationController.list);
router.get('/conversations/:id', ...authAndLicense, ConversationController.getById);

// ─── Contatos ─────────────────────────────────────────────────────────────
router.get('/contacts/blocked', ...authAndLicense, UserContactController.getBlockedContacts);
router.post('/contacts', ...authAndLicense, UserContactController.createContact);
router.get('/contacts', ...authAndLicense, UserContactController.getContacts);
router.put('/contacts/:id', ...authAndLicense, UserContactController.updateContact);
router.delete('/contacts/:id', ...authAndLicense, UserContactController.deleteContact);
router.patch('/contacts/:id/block', ...authAndLicense, UserContactController.blockContact);
router.patch('/contacts/:id/unblock', ...authAndLicense, UserContactController.unblockContact);

// ─── Contatos bloqueados ──────────────────────────────────────────────────
router.get('/blocked', ...authAndLicense, BlockedController.getBlockedContacts);
router.post('/blocked', ...authAndLicense, BlockedController.blockContact);
router.delete('/blocked/:id', ...authAndLicense, BlockedController.unblockContact);

// ─── Instruções ───────────────────────────────────────────────────────────
router.get('/instructions', ...authAndLicense, InstructionController.getMine);
router.put('/instructions', ...authAndLicense, InstructionController.upsertMine);

// ─── Configurações da conta (abertas para exibir aviso de licença no painel) ─
// GET /settings fica livre (apenas auth) para que o frontend consiga exibir
// a tela de faturamento mesmo com assinatura expirada.
router.get('/settings', requireAuth, UserSettingController.getMine);
router.patch('/settings/lead-qualification', ...authAndLicense, UserSettingController.updateLeadQualification);
router.patch('/settings/tts-reply', ...authAndLicense, UserSettingController.updateTtsReply);
router.get('/settings/voice-clone', requireAuth, UserSettingController.getVoiceCloneStatus);
router.post('/settings/voice-clone', ...authAndLicense, UserSettingController.uploadVoiceClone);
router.delete('/settings/voice-clone', ...authAndLicense, UserSettingController.deleteVoiceClone);

// ─── Envio em massa / programado ─────────────────────────────────────────
router.get('/bulk-messages/limits', ...authAndLicense, BulkMessageController.limits);
router.get('/bulk-messages', ...authAndLicense, BulkMessageController.list);
router.post('/bulk-messages', ...authAndLicense, BulkMessageController.create);
router.get('/bulk-messages/:id', ...authAndLicense, BulkMessageController.getById);
router.post('/bulk-messages/:id/cancel', ...authAndLicense, BulkMessageController.cancel);
router.post('/bulk-messages/:id/pause', ...authAndLicense, BulkMessageController.pause);
router.post('/bulk-messages/:id/resume', ...authAndLicense, BulkMessageController.resume);

// ─── Tags de qualificação de leads ───────────────────────────────────────
router.get('/lead-tags', ...authAndLicense, LeadTagController.list);
router.post('/lead-tags', ...authAndLicense, LeadTagController.create);
router.put('/lead-tags/:id', ...authAndLicense, LeadTagController.update);
router.delete('/lead-tags/:id', ...authAndLicense, LeadTagController.remove);

export default router;

