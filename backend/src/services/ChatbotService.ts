import { getBase64FromMediaMessageDto } from '../../../api-evolution/src/api/dto/chat.dto.js';
import axios from 'axios';
import MessageProcessor from './MessageProcessor.js';
import { prisma } from '../lib/prisma.js';
import { findUserById } from '../authStore.js';

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${process.env.PORT || 3001}/api/webhook/evolution`;

export class EvolutionService {
  static async toggleChatbot(instanceName: string, enabled: boolean) {
    await prisma.connection.update({ where: { instance_id: instanceName }, data: { chatbot_enabled: enabled } });
    // if (enabled) await this.setupWebhook(instanceName);
    return enabled;
  }
}
