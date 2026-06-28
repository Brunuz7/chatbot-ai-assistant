import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AgentController } from '../controllers/AgentController.js';
import { FlowController } from '../controllers/FlowController.js';
import { ConnectionController } from '../controllers/ConnectionController.js';
import { UserContactController } from '../controllers/UserContactController.js';
import { KnowledgeBaseController } from '../controllers/KnowledgeBaseController.js';
import { ConversationController } from '../controllers/ConversationController.js';
import { TagController } from '../controllers/TagController.js';
import { UserSettingController } from '../controllers/UserSettingController.js';
import { BulkMessageCampaignController } from '../controllers/BulkMessageCampaignController.js';
import { TemplateController } from '../controllers/TemplateController.js';
import { PlanController } from '../controllers/PlanController.js';
import { WebhookController } from '../controllers/WebhookController.js';
import { UserInstructionController } from '../controllers/UserInstructionController.js';
import { StoreController } from '../controllers/StoreController.js';
import { storeImageUpload } from '../middleware/storeUpload.js';
import multer from 'multer';
import { TemplateService } from '../services/TemplateService.js';

const templateSampleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, TemplateService.sampleMimeTypes.has(file.mimetype));
  },
});

const router = Router();

// Planos (catálogo público + plano do usuário)
router.get('/plans', PlanController.list);
router.get('/me/plan', requireAuth, PlanController.mine);

// Agent
router.get('/agents', requireAuth, AgentController.list);
router.post('/agents', requireAuth, AgentController.create);
router.get('/agents/:agentId/flows', requireAuth, FlowController.list);
router.post('/agents/:agentId/flows', requireAuth, FlowController.createForAgent);
router.get('/agents/:id', requireAuth, AgentController.getById);
router.put('/agents/:id', requireAuth, AgentController.update);
router.delete('/agents/:id', requireAuth, AgentController.delete);

// Flow
router.post('/flows', requireAuth, FlowController.create);
router.get('/flows', requireAuth, FlowController.listAll);
router.put('/flows/:flowId', requireAuth, FlowController.update);
router.delete('/flows/:flowId', requireAuth, FlowController.delete);

// Connection (Evolution + WhatsApp Oficial)
router.get('/connections', requireAuth, ConnectionController.list);
router.get('/automations', requireAuth, ConnectionController.listAutomations);
router.get('/connection/overview', requireAuth, ConnectionController.getOverview);
router.patch('/connection/channel', requireAuth, ConnectionController.setChannel);
router.post('/connection/chatbot/toggle', requireAuth, ConnectionController.toggleChatbot);
router.get('/instance/qrcode', requireAuth, ConnectionController.getQRCode);
router.get('/metrics', requireAuth, ConnectionController.getMetrics);
router.get('/instance/status', requireAuth, ConnectionController.getInstanceStatus);
router.post('/instance/chatbot/toggle', requireAuth, ConnectionController.toggleEvolutionChatbot);
router.get('/whatsapp-official/status', requireAuth, ConnectionController.getOfficialStatus);
router.post('/whatsapp-official/signup/start', requireAuth, ConnectionController.startOfficialSignup);
router.post('/whatsapp-official/signup/complete', requireAuth, ConnectionController.completeOfficialSignup);
router.post('/whatsapp-official/disconnect', requireAuth, ConnectionController.disconnectOfficial);

// Webhook (sem auth)
router.post('/webhook/evolution', WebhookController.handleEvolution);

// KnowledgeBase
router.get('/knowledge', requireAuth, KnowledgeBaseController.list);
router.post('/knowledge', requireAuth, KnowledgeBaseController.create);
router.put('/knowledge/:id', requireAuth, KnowledgeBaseController.update);
router.delete('/knowledge/:id', requireAuth, KnowledgeBaseController.remove);

// Loja integrada (imagens Cloudinary)
router.get('/store/cloudinary', requireAuth, StoreController.getCloudinaryConfig);
router.post('/store/images', requireAuth, storeImageUpload.single('file'), StoreController.uploadImage);
router.delete('/store/images', requireAuth, StoreController.deleteImage);

// Conversation
router.get('/conversations', requireAuth, ConversationController.list);
router.get('/conversations/:id', requireAuth, ConversationController.getById);
router.get('/dashboard/stats', requireAuth, ConversationController.getMessageStats);

// UserContact
router.get('/contacts/blocked', requireAuth, UserContactController.getBlockedContacts);
router.post('/contacts', requireAuth, UserContactController.createContact);
router.get('/contacts', requireAuth, UserContactController.getContacts);
router.put('/contacts/:id', requireAuth, UserContactController.updateContact);
router.delete('/contacts/:id', requireAuth, UserContactController.deleteContact);
router.patch('/contacts/:id/block', requireAuth, UserContactController.blockContact);
router.patch('/contacts/:id/unblock', requireAuth, UserContactController.unblockContact);

// UserInstruction
router.get('/instructions', requireAuth, UserInstructionController.getMine);
router.put('/instructions', requireAuth, UserInstructionController.upsertMine);

// UserSetting
router.get('/settings', requireAuth, UserSettingController.getMine);
router.patch('/settings/tagging', requireAuth, UserSettingController.updateTagging);
router.patch('/settings/lead-qualification', requireAuth, UserSettingController.updateTagging);
router.patch('/settings/schedule', requireAuth, UserSettingController.updateSchedule);
router.patch('/settings/tts-reply', requireAuth, UserSettingController.updateTtsReply);
router.get('/settings/voice-clone', requireAuth, UserSettingController.getVoiceCloneStatus);
router.post('/settings/voice-clone', requireAuth, UserSettingController.uploadVoiceClone);
router.delete('/settings/voice-clone', requireAuth, UserSettingController.deleteVoiceClone);

// BulkMessageCampaign
router.get('/bulk-messages/limits', requireAuth, BulkMessageCampaignController.limits);
router.get('/bulk-messages', requireAuth, BulkMessageCampaignController.list);
router.post('/bulk-messages', requireAuth, BulkMessageCampaignController.create);
router.get('/bulk-messages/:id', requireAuth, BulkMessageCampaignController.getById);
router.post('/bulk-messages/:id/cancel', requireAuth, BulkMessageCampaignController.cancel);
router.post('/bulk-messages/:id/pause', requireAuth, BulkMessageCampaignController.pause);
router.post('/bulk-messages/:id/resume', requireAuth, BulkMessageCampaignController.resume);

// WhatsApp templates (API oficial)
router.get('/whatsapp-templates', requireAuth, TemplateController.list);
router.post(
  '/whatsapp-templates/upload-sample',
  requireAuth,
  templateSampleUpload.single('file'),
  TemplateController.uploadSample,
);
router.post('/whatsapp-templates', requireAuth, TemplateController.create);
router.post('/whatsapp-templates/:id/sync', requireAuth, TemplateController.sync);

// Tag
router.get('/tags', requireAuth, TagController.list);
router.post('/tags', requireAuth, TagController.create);
router.put('/tags/:id', requireAuth, TagController.update);
router.delete('/tags/:id', requireAuth, TagController.remove);
router.get('/lead-tags', requireAuth, TagController.list);
router.post('/lead-tags', requireAuth, TagController.create);
router.put('/lead-tags/:id', requireAuth, TagController.update);
router.delete('/lead-tags/:id', requireAuth, TagController.remove);

export default router;
