import axios from 'axios';
import { prisma } from '../prisma.js';
import type {
  CreateWhatsAppTemplateInput,
  TemplateButtonInput,
  TemplateHeaderInput,
  WhatsAppTemplateCategory,
  WhatsAppTemplateRow,
  WhatsAppTemplateStatus,
} from '../types/whatsappTemplate.js';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { UserSettingService } from './UserSettingService.js';
import { WhatsAppService } from './WhatsAppService.js';

const OFFICIAL_TYPE = 'WHATSAPP_OFFICIAL';
const GRAPH_VERSION = (process.env.META_GRAPH_VERSION || 'v25.0').trim();
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const TEMPLATE_NAME_RE = /^[a-z0-9_]+$/;
const DEFAULT_LANGUAGE = 'pt_BR';

export class TemplateService {
  static readonly categories: WhatsAppTemplateCategory[] = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];

  static readonly sampleMimeTypes = new Set(['image/jpeg', 'image/png', 'video/mp4', 'application/pdf']);

  private static toRow(row: {
    id: string;
    name: string;
    category: string;
    language: string;
    body: string;
    footer: string | null;
    components: unknown;
    meta_template_id: string | null;
    status: string;
    rejection_reason: string | null;
    created_at: Date;
    updated_at: Date;
  }): WhatsAppTemplateRow {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      language: row.language,
      body: row.body,
      footer: row.footer,
      components: row.components,
      meta_template_id: row.meta_template_id,
      status: row.status as WhatsAppTemplateStatus,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private static normalizeName(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private static countVariables(text: string): number {
    const matches = text.match(/\{\{\d+\}\}/g) ?? [];
    if (matches.length === 0) return 0;
    return Math.max(...matches.map((m) => Number.parseInt(m.replace(/\D/g, ''), 10)));
  }

  private static validateButtons(buttons: TemplateButtonInput[], category: WhatsAppTemplateCategory) {
    if (category === 'AUTHENTICATION') throw new Error('invalid_template_buttons');
    if (buttons.length === 0) return;

    const types = new Set(buttons.map((b) => b.type));
    if (types.has('QUICK_REPLY') && (types.has('URL') || types.has('PHONE_NUMBER')))
      throw new Error('invalid_template_buttons');

    if (types.has('QUICK_REPLY') && buttons.length > 3) throw new Error('invalid_template_buttons');
    if ((types.has('URL') || types.has('PHONE_NUMBER')) && buttons.length > 2)
      throw new Error('invalid_template_buttons');
  }

  private static buildMetaButtons(buttons: TemplateButtonInput[]): Record<string, unknown>[] {
    return buttons.map((button) => {
      if (button.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: button.text.trim() };
      if (button.type === 'PHONE_NUMBER') {
        return {
          type: 'PHONE_NUMBER',
          text: button.text.trim(),
          phone_number: button.phone_number.trim(),
        };
      }
      const url = button.url.trim();
      const item: Record<string, unknown> = { type: 'URL', text: button.text.trim(), url };
      const varCount = TemplateService.countVariables(url);
      if (varCount > 0) {
        const example = button.example?.trim();
        if (!example) throw new Error('invalid_button_example');
        item.example = [example];
      }
      return item;
    });
  }

  private static buildMetaComponents(input: CreateWhatsAppTemplateInput): Record<string, unknown>[] {
    const components: Record<string, unknown>[] = [];
    const category = input.category;
    const header = input.header ?? { type: 'none' as const };

    if (category !== 'AUTHENTICATION' && header.type === 'text' && header.text.trim())
      components.push({ type: 'HEADER', format: 'TEXT', text: header.text.trim() });
    else if (category !== 'AUTHENTICATION' && ['image', 'video', 'document'].includes(header.type)) {
      const mediaHeader = header as Extract<TemplateHeaderInput, { type: 'image' | 'video' | 'document' }>;
      if (!mediaHeader.sample_handle?.trim()) throw new Error('invalid_header_sample');
      const format = header.type.toUpperCase();
      components.push({
        type: 'HEADER',
        format,
        example: { header_handle: [mediaHeader.sample_handle.trim()] },
      });
    }

    const bodyText = String(input.body ?? '').trim();
    const varCount = TemplateService.countVariables(bodyText);
    const bodyComponent: Record<string, unknown> = { type: 'BODY', text: bodyText };
    if (varCount > 0) {
      const examples = (input.body_examples ?? []).map((v) => String(v).trim()).filter(Boolean);
      if (examples.length < varCount) throw new Error('invalid_body_examples');
      bodyComponent.example = { body_text: [examples.slice(0, varCount)] };
    }
    components.push(bodyComponent);

    const footerText = input.footer?.trim();
    if (category !== 'AUTHENTICATION' && footerText) components.push({ type: 'FOOTER', text: footerText });

    if (category === 'AUTHENTICATION') {
      if (varCount < 1) throw new Error('auth_requires_variable');
      components.push({
        type: 'BUTTONS',
        buttons: [
          {
            type: 'OTP',
            otp_type: 'COPY_CODE',
            text: String(input.copy_code_text ?? 'Copiar código').trim() || 'Copiar código',
          },
        ],
      });
    } else if (input.buttons?.length) {
      TemplateService.validateButtons(input.buttons, category);
      components.push({ type: 'BUTTONS', buttons: TemplateService.buildMetaButtons(input.buttons) });
    }

    return components;
  }

  private static async getOfficialConnection(userId: string) {
    const channel = await UserSettingService.getWhatsappChannel(userId);
    if (channel !== 'official') throw new Error('templates_require_official_channel');

    const status = await WhatsAppService.getStatus(userId);
    if (!status.connected || !status.waba_id) throw new Error('whatsapp_official_disconnected');

    const conn = await prisma.connection.findFirst({
      where: { user_id: userId, type: OFFICIAL_TYPE, status: 'CONNECTED' },
      orderBy: { updated_at: 'desc' },
    });
    if (!conn?.access_token || !conn.waba_id) throw new Error('whatsapp_official_disconnected');

    return { accessToken: conn.access_token, wabaId: conn.waba_id };
  }

  static async uploadHeaderSample(
    userId: string,
    file: Buffer,
    mimeType: string,
  ): Promise<{ handle: string; mime_type: string }> {
    const appId = (process.env.META_APP_ID || '').trim();
    if (!appId) throw new Error('meta_app_not_configured');
    if (!TemplateService.sampleMimeTypes.has(mimeType)) throw new Error('invalid_sample_mime');

    const { accessToken } = await TemplateService.getOfficialConnection(userId);

    let sessionId: string;
    try {
      const { data } = await axios.post(`${GRAPH_BASE}/${appId}/uploads`, null, {
        params: { file_length: file.length, file_type: mimeType },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000,
      });
      sessionId = String((data as { id?: string })?.id ?? '').trim();
      if (!sessionId) throw new Error('upload_session_failed');
    } catch (err) {
      const metaMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      throw new Error(metaMsg ? `meta_upload_error:${metaMsg}` : 'upload_session_failed');
    }

    try {
      const { data } = await axios.post(`${GRAPH_BASE}/${sessionId}`, file, {
        headers: {
          Authorization: `OAuth ${accessToken}`,
          'Content-Type': mimeType,
          'Content-Length': String(file.length),
        },
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const handle = String((data as { h?: string })?.h ?? '').trim();
      if (!handle) throw new Error('upload_handle_failed');
      return { handle, mime_type: mimeType };
    } catch (err) {
      const metaMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      throw new Error(metaMsg ? `meta_upload_error:${metaMsg}` : 'upload_handle_failed');
    }
  }

  static async listByUser(userId: string): Promise<WhatsAppTemplateRow[]> {
    const rows = await prisma.whatsAppTemplate.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => TemplateService.toRow(row));
  }

  static async create(userId: string, input: CreateWhatsAppTemplateInput): Promise<WhatsAppTemplateRow> {
    const name = TemplateService.normalizeName(input.name);
    const body = String(input.body ?? '').trim();
    const language = DEFAULT_LANGUAGE;
    const category = String(input.category ?? '')
      .trim()
      .toUpperCase() as WhatsAppTemplateCategory;
    const footer = input.footer != null ? String(input.footer).trim() || null : null;

    if (!name || !TEMPLATE_NAME_RE.test(name)) throw new Error('invalid_template_name');
    if (!body) throw new Error('invalid_template_body');
    if (!TemplateService.categories.includes(category)) throw new Error('invalid_template_category');

    const components = TemplateService.buildMetaComponents({ ...input, category, body, footer });
    const { accessToken, wabaId } = await TemplateService.getOfficialConnection(userId);

    let metaResponse: { id?: string; status?: string; category?: string };
    try {
      const { data } = await axios.post(
        `${GRAPH_BASE}/${wabaId}/message_templates`,
        {
          name,
          category,
          allow_category_change: true,
          language,
          components,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );
      metaResponse = data as { id?: string; status?: string; category?: string };
    } catch (err) {
      const metaMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      throw new Error(metaMsg ? `meta_template_error:${metaMsg}` : 'meta_template_error');
    }

    const metaStatus = String(metaResponse.status ?? 'PENDING').toUpperCase();
    const status: WhatsAppTemplateStatus =
      metaStatus === 'APPROVED' ? 'APPROVED' : metaStatus === 'REJECTED' ? 'REJECTED' : 'PENDING';

    const row = await prisma.whatsAppTemplate.create({
      data: {
        user_id: userId,
        name,
        category,
        language,
        body,
        footer,
        components,
        meta_template_id: metaResponse.id ?? null,
        status,
      },
    });

    return TemplateService.toRow(row);
  }

  private static async fetchMetaStatus(
    accessToken: string,
    wabaId: string,
    name: string,
  ): Promise<{ status: WhatsAppTemplateStatus; rejection_reason: string | null }> {
    try {
      const { data } = await axios.get(`${GRAPH_BASE}/${wabaId}/message_templates`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { name, fields: 'name,status,rejected_reason,category,language' },
        timeout: 20000,
      });
      const list = (data as { data?: Record<string, unknown>[] })?.data ?? [];
      const match = list.find((item) => String(item.name ?? '') === name) ?? list[0];
      if (!match) return { status: 'PENDING', rejection_reason: null };

      const rawStatus = String(match.status ?? 'PENDING').toUpperCase();
      const status: WhatsAppTemplateStatus =
        rawStatus === 'APPROVED' ? 'APPROVED' : rawStatus === 'REJECTED' ? 'REJECTED' : 'PENDING';
      const rejection_reason =
        typeof match.rejected_reason === 'string' && match.rejected_reason.trim() ? match.rejected_reason.trim() : null;

      return { status, rejection_reason };
    } catch (err) {
      console.error('Template sync Meta:', getErrorMessage(err));
      throw new Error('meta_sync_failed');
    }
  }

  static async syncById(userId: string, id: string): Promise<WhatsAppTemplateRow> {
    const row = await prisma.whatsAppTemplate.findFirst({ where: { id, user_id: userId } });
    if (!row) throw new Error('not_found');
    if (row.status !== 'PENDING') return TemplateService.toRow(row);

    const { accessToken, wabaId } = await TemplateService.getOfficialConnection(userId);
    const meta = await TemplateService.fetchMetaStatus(accessToken, wabaId, row.name);

    const updated = await prisma.whatsAppTemplate.update({
      where: { id: row.id },
      data: { status: meta.status, rejection_reason: meta.rejection_reason },
    });

    return TemplateService.toRow(updated);
  }

  static async syncPending(userId: string): Promise<WhatsAppTemplateRow[]> {
    const pending = await prisma.whatsAppTemplate.findMany({
      where: { user_id: userId, status: 'PENDING' },
      orderBy: { created_at: 'desc' },
    });
    if (pending.length === 0) return TemplateService.listByUser(userId);

    for (const row of pending) {
      try {
        await TemplateService.syncById(userId, row.id);
      } catch {
        // keep pending on transient errors
      }
    }

    return TemplateService.listByUser(userId);
  }
}
