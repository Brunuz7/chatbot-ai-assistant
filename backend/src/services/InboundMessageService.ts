import type { WebhookInboundJob } from '@prisma/client';
import { prisma, withNotDeleted } from '../prisma.js';
import type { FlowProcessResult } from '../types/index.js';
import type { InboundJobProcessOutcome } from '../types/inboundMessage.js';
import type { ConversationMessageEntry } from '../types/conversation.js';
import { buildMessagesUpdate } from '../utils/conversation.js';
import {
  conversationPhone,
  extractEvolutionInboundText,
  formatInboundContentForHistory,
  messageHasAudio,
  resolveEvolutionInboundText,
} from '../utils/evolutionInbound.js';
import { extractMetaInboundText } from '../utils/metaInbound.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import {
  audioUntranscribedFlowInstruction,
  audioUntranscribedHistory,
  emptyCurrentMessage,
  mediaOtherHistory,
} from '../constants/prompts.js';
import { amplifySpeechMp3, clampTtsText, shouldReplyWithAudio } from '../utils/ttsAudio.js';
import { FlowEngineService } from './FlowEngineService.js';
import { TagService } from './TagService.js';
import { EvolutionService } from './EvolutionService.js';
import { WhatsAppService } from './WhatsAppService.js';
import { UserSettingService } from './UserSettingService.js';
import { MistralVoiceService } from './MistralVoiceService.js';
import { OpenRouterService } from './OpenRouterService.js';
import { StoreService } from './StoreService.js';

async function hasNewerPendingInboundJob(params: {
  connectionId: string;
  remoteJid: string;
  createdAt: Date;
}): Promise<boolean> {
  const newer = await prisma.webhookInboundJob.findFirst({
    where: {
      connection_id: params.connectionId,
      remote_jid: params.remoteJid,
      status: 'pending',
      created_at: { gt: params.createdAt },
    },
    select: { id: true },
  });
  return newer !== null;
}

type JobInboundText = {
  incomingContent: string;
  flowInput: string;
  hadAudio: boolean;
  webhookEvent: string | null;
};

export class InboundMessageService {
  static async processJob(
    job: WebhookInboundJob,
    options?: { batchJobs?: WebhookInboundJob[] },
  ): Promise<InboundJobProcessOutcome> {
    const skipIfSuperseded = () =>
      hasNewerPendingInboundJob({
        connectionId: job.connection_id,
        remoteJid: job.remote_jid,
        createdAt: job.created_at,
      });

    if (await skipIfSuperseded()) return 'superseded';

    const batchJobs = options?.batchJobs?.length ? options.batchJobs : [job];

    const connection = await prisma.connection.findUnique({ where: { id: job.connection_id } });

    if (!connection) throw new Error('connection_not_found');
    if (!connection.chatbot_enabled) return 'processed';

    const { instance_name: instanceName, remote_jid: remoteJid } = job;
    const userId = connection.user_id;
    const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

    const contactId = await this.resolveContactId(userId, remoteJid, cleanPhone);

    const resolvedBatch: JobInboundText[] = [];
    for (const batchJob of batchJobs) {
      resolvedBatch.push(await this.resolveJobInboundText(batchJob, instanceName));
    }

    const hadAudio = resolvedBatch.some((entry) => entry.hadAudio);
    const flowInput = resolvedBatch
      .map((entry) => entry.flowInput.trim())
      .filter(Boolean)
      .join('\n');
    const effectiveFlowInput =
      flowInput || resolvedBatch[resolvedBatch.length - 1]?.flowInput.trim() || emptyCurrentMessage;
    const webhookEvent = resolvedBatch[resolvedBatch.length - 1]?.webhookEvent ?? null;

    for (const entry of resolvedBatch) {
      try {
        await this.appendConversationMessage(userId, remoteJid, contactId, {
          direction: 'in',
          content: entry.incomingContent,
          timestamp: new Date().toISOString(),
        });
      } catch (convErr: unknown) {
        console.warn('Erro ao registar conversa:', getErrorMessage(convErr));
      }
    }

    let result: FlowProcessResult;
    try {
      result = await FlowEngineService.executeInboundFlow({
        userId,
        phoneNumber: remoteJid.split('@')[0] || remoteJid,
        whatsappId: remoteJid,
        incomingText: effectiveFlowInput,
        webhookEvent,
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      console.error('FlowEngine.executeInboundFlow falhou:', msg);
      result = {
        outbound: [
          {
            kind: 'text',
            text: 'Não foi possível processar sua mensagem agora. Tente novamente em instantes.',
            delayMs: 1200,
          },
        ],
        flowResume: null,
      };
    }

    if (await skipIfSuperseded()) return 'superseded';

    try {
      const convRow = await this.findConversationForUser(userId, remoteJid);
      if (convRow) {
        await prisma.conversation.update({
          where: { id: convRow.id },
          data: result.flowResume === null ? { active_flow_id: null } : { active_flow_id: result.flowResume.flowId },
        });
      }
    } catch (persistErr: unknown) {
      console.warn('Erro ao persistir estado do fluxo:', getErrorMessage(persistErr));
    }

    const outbound = result.outbound || [];
    const reply = outbound.length > 0 ? outbound[outbound.length - 1] : null;


    if (reply?.text?.trim()) {
      if (await skipIfSuperseded()) return 'superseded';

      const rawReply = reply.text.trim();
      await this.deliverStoreProductImages({
        userId,
        instanceName,
        remoteJid,
        replyText: rawReply,
        clientMessage: effectiveFlowInput,
      });
      const clientText = StoreService.sanitizeReplyForClient(rawReply);
      const delayMs = reply.delayMs ?? 1200;
      const channel = await this.deliverOutboundReply({
        instanceName,
        remoteJid,
        replyText: clientText,
        delayMs,
        userId,
        contactSentAudio: hadAudio,
        forceAudio: reply.forceAudio === true,
      });

      const outPreview = channel === 'audio' ? `[voz] ${clientText}` : clientText;

      try {
        await this.appendConversationMessage(userId, remoteJid, contactId, {
          direction: 'out',
          content: outPreview,
          timestamp: new Date().toISOString(),
        });
      } catch (convErr: unknown) {
        console.warn('Erro ao registar mensagem de saída:', getErrorMessage(convErr));
      }
    } 

    try {
      await TagService.tagFromConversation({
        userId,
        contactId,
        whatsappId: remoteJid,
        incomingText: effectiveFlowInput,
      });
    } catch (qualErr: unknown) {
      console.warn('Erro na classificação automática do contacto:', getErrorMessage(qualErr));
    }

    return 'processed';
  }

  private static async resolveJobInboundText(job: WebhookInboundJob, instanceName: string): Promise<JobInboundText> {
    const payload = job.payload as {
      source?: string;
      message?: Record<string, unknown> | null;
      webhookMessage?: Record<string, unknown> | null;
      metaMessage?: Record<string, unknown> | null;
      webhookEvent?: string | null;
    };
    const isMetaCloud = payload?.source === 'meta_cloud';
    const message = payload?.message ?? undefined;
    const webhookMessage = payload?.webhookMessage ?? undefined;
    const metaMessage = payload?.metaMessage ?? undefined;
    const webhookEvent = payload?.webhookEvent ?? null;

    const hadAudio = isMetaCloud
      ? job.inbound_kind === 'meta.audio'
      : messageHasAudio(message) || job.inbound_kind === 'upsert.audio' || job.inbound_kind === 'upsert.speech';
    const resolvedText = isMetaCloud
      ? extractMetaInboundText(metaMessage, message).trim()
      : (await resolveEvolutionInboundText(instanceName, message, webhookMessage)).trim();

    if (resolvedText) {
      return {
        incomingContent: formatInboundContentForHistory(resolvedText, hadAudio),
        flowInput: resolvedText,
        hadAudio,
        webhookEvent,
      };
    }

    if (hadAudio) {
      return {
        incomingContent: audioUntranscribedHistory,
        flowInput: audioUntranscribedFlowInstruction,
        hadAudio,
        webhookEvent,
      };
    }

    const incomingContent = extractEvolutionInboundText(message) || mediaOtherHistory;
    return {
      incomingContent,
      flowInput: incomingContent === mediaOtherHistory ? emptyCurrentMessage : incomingContent,
      hadAudio,
      webhookEvent,
    };
  }

  private static normalizeContactPhone(value: string): string {
    const local = value.includes('@') ? value.split('@')[0] : value;
    return local.replace(/\D/g, '');
  }

  private static async resolveContactId(userId: string, whatsappId: string, phoneNumber?: string): Promise<string> {
    const cleanPhone = this.normalizeContactPhone(phoneNumber ?? conversationPhone(whatsappId));

    let contact = await prisma.userContact.findFirst({
      where: withNotDeleted({
        user_id: userId,
        OR: [{ whatsapp_id: whatsappId }, { phone_number: cleanPhone }],
      }),
      select: { id: true, whatsapp_id: true },
    });

    if (!contact) {
      contact = await prisma.userContact.create({
        data: { user_id: userId, phone_number: cleanPhone, whatsapp_id: whatsappId },
        select: { id: true, whatsapp_id: true },
      });
    } else if (!contact.whatsapp_id) {
      await prisma.userContact.update({
        where: { id: contact.id },
        data: { whatsapp_id: whatsappId },
      });
    }

    return contact.id;
  }

  private static async appendConversationMessage(
    userId: string,
    whatsappId: string,
    contactId: string,
    entry: ConversationMessageEntry,
  ): Promise<void> {
    const existing = await prisma.conversation.findUnique({
      where: { user_id_whatsapp_id: { user_id: userId, whatsapp_id: whatsappId } },
      select: { id: true, messages: true, contact_id: true },
    });

    if (existing) {
      const patch = buildMessagesUpdate(existing.messages, entry);
      await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          contact_id: existing.contact_id ?? contactId,
          messages: patch.messages as object,
          message_count: patch.message_count,
          last_message_at: patch.last_message_at,
          last_message_direction: patch.last_message_direction,
          last_message_preview: patch.last_message_preview,
        },
      });
      return;
    }

    const patch = buildMessagesUpdate([], entry);
    await prisma.conversation.create({
      data: {
        user_id: userId,
        contact_id: contactId,
        phone_number: conversationPhone(whatsappId),
        whatsapp_id: whatsappId,
        messages: patch.messages as object,
        message_count: patch.message_count,
        last_message_at: patch.last_message_at,
        last_message_direction: patch.last_message_direction,
        last_message_preview: patch.last_message_preview,
      },
    });
  }

  private static async findConversationForUser(userId: string, whatsappId: string) {
    return prisma.conversation.findUnique({
      where: { user_id_whatsapp_id: { user_id: userId, whatsapp_id: whatsappId } },
    });
  }

  private static async deliverStoreProductImages(params: {
    userId: string;
    instanceName: string;
    remoteJid: string;
    replyText: string;
    clientMessage: string;
  }): Promise<void> {
    const products = await StoreService.listProducts(params.userId);
    if (!products.length) return;

    const productIds = StoreService.resolveProductIdsForImages(params.replyText, params.clientMessage, products);
    const deliveries = StoreService.getProductImagesForDelivery(products, productIds);
    if (!deliveries.length) return;

    const connection = await prisma.connection.findUnique({ where: { instance_id: params.instanceName } });
    const number = conversationPhone(params.remoteJid);

    for (const [index, item] of deliveries.entries()) {
      let sent = false;
      if (connection?.type === 'WHATSAPP_OFFICIAL') {
        sent = await WhatsAppService.sendImage(connection, params.remoteJid, item.url, item.caption);
      } else {
        sent = await EvolutionService.sendImage(params.instanceName, {
          number,
          media: item.url,
          caption: item.caption,
          delay: index === 0 ? 400 : 800,
        });
      }
      if (index < deliveries.length - 1) await new Promise((r) => setTimeout(r, 600));
    }
  }

  private static async deliverOutboundReply(params: {
    instanceName: string;
    remoteJid: string;
    replyText: string;
    delayMs: number;
    userId: string;
    contactSentAudio: boolean;
    forceAudio?: boolean;
  }): Promise<'audio' | 'text' | 'none'> {
    const connection = await prisma.connection.findUnique({
      where: { instance_id: params.instanceName },
    });

    if (connection?.type === 'WHATSAPP_OFFICIAL') {
      if (params.delayMs > 0) await new Promise((r) => setTimeout(r, Math.min(params.delayMs, 5000)));

      return WhatsAppService.deliverReply(connection, params.remoteJid, params.replyText);
    }

    const number = conversationPhone(params.remoteJid);
    const channel = await this.trySendAudioReply({
      instanceName: params.instanceName,
      number,
      replyText: params.replyText,
      delayMs: params.delayMs,
      userId: params.userId,
      contactSentAudio: params.contactSentAudio,
      forceAudio: params.forceAudio === true,
    });

    if (channel === 'audio') return 'audio';

    const textSent = await EvolutionService.sendMessage(params.instanceName, {
      number,
      text: params.replyText,
      delay: params.delayMs,
      linkPreview: false,
    });

    if (!textSent) return 'none';
    return 'text';
  }

  private static async trySendAudioReply(params: {
    instanceName: string;
    number: string;
    replyText: string;
    delayMs: number;
    userId: string;
    contactSentAudio: boolean;
    forceAudio?: boolean;
  }): Promise<'audio' | 'text'> {
    let tts;
    try {
      tts = await UserSettingService.getTtsReplySettings(params.userId);
    } catch (err: unknown) {
      return 'text';
    }

    const audioPolicy = shouldReplyWithAudio({ force: params.forceAudio === true });
    if (!audioPolicy) return 'text';

    const speechText = clampTtsText(params.replyText, tts.tts_max_chars);
    if (!speechText) return 'text';

    try {
      let audioBuffer: Buffer;
      const useClone = tts.tts_voice_type === 'clone' && !!tts.mistral_voice_id;

      if (useClone) {
        audioBuffer = await MistralVoiceService.synthesizeWithClonedVoice({
          text: speechText,
          voiceId: tts.mistral_voice_id!,
        });
      } else {
        audioBuffer = await OpenRouterService.synthesizeSpeech({
          text: speechText,
          voice: tts.tts_voice,
          model: tts.tts_model,
        });
      }

      audioBuffer = await amplifySpeechMp3(audioBuffer);

      let sent = await EvolutionService.sendAudio(params.instanceName, {
        number: params.number,
        audio: audioBuffer.toString('base64'),
        delay: params.delayMs,
        encoding: true,
      });
      if (!sent) {
        sent = await EvolutionService.sendAudio(params.instanceName, {
          number: params.number,
          audio: audioBuffer.toString('base64'),
          delay: params.delayMs,
          encoding: false,
        });
      }

      return sent ? 'audio' : 'text';
    } catch (err: unknown) {
      return 'text';
    }
  }
}

export { hasNewerPendingInboundJob };
