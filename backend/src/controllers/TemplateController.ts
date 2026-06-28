import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import type {
  CreateWhatsAppTemplateInput,
  TemplateButtonInput,
  TemplateHeaderInput,
  WhatsAppTemplateCategory,
} from '../types/whatsappTemplate.js';
import { TemplateService } from '../services/TemplateService.js';

function pickId(params: AuthRequest['params'], key = 'id'): string | null {
  const v = params[key];
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function parseHeader(raw: unknown): TemplateHeaderInput {
  if (!raw || typeof raw !== 'object') return { type: 'none' };
  const h = raw as Record<string, unknown>;
  const type = String(h.type ?? 'none').toLowerCase();
  if (type === 'text') return { type: 'text', text: String(h.text ?? '') };
  if (type === 'image' || type === 'video' || type === 'document')
    return { type, sample_handle: String(h.sample_handle ?? '') };

  return { type: 'none' };
}

function parseButtons(raw: unknown): TemplateButtonInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const b = item as Record<string, unknown>;
      const type = String(b.type ?? '').toUpperCase();
      if (type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: String(b.text ?? '') } as TemplateButtonInput;
      if (type === 'URL') {
        return {
          type: 'URL',
          text: String(b.text ?? ''),
          url: String(b.url ?? ''),
          example: b.example != null ? String(b.example) : undefined,
        } as TemplateButtonInput;
      }
      if (type === 'PHONE_NUMBER') {
        return {
          type: 'PHONE_NUMBER',
          text: String(b.text ?? ''),
          phone_number: String(b.phone_number ?? ''),
        } as TemplateButtonInput;
      }
      return null;
    })
    .filter(Boolean) as TemplateButtonInput[];
}

export class TemplateController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const sync = req.query.sync === '1' || req.query.sync === 'true';
      const items = sync
        ? await TemplateService.syncPending(req.user!.sub)
        : await TemplateService.listByUser(req.user!.sub);
      res.json(items);
    } catch (err) {
      console.error('Template list:', err);
      res.status(500).json({ error: 'Falha ao listar templates' });
    }
  }

  static async uploadSample(req: AuthRequest, res: Response) {
    try {
      const file = req.file;
      if (!file?.buffer?.length) return res.status(400).json({ error: 'Envie um ficheiro de amostra.' });
      const result = await TemplateService.uploadHeaderSample(req.user!.sub, file.buffer, file.mimetype);
      res.json(result);
    } catch (err: unknown) {
      const code = (err as Error).message;
      const map: Record<string, { status: number; error: string }> = {
        invalid_sample_mime: {
          status: 400,
          error: 'Formato inválido. Use JPEG, PNG, MP4 ou PDF.',
        },
        meta_app_not_configured: { status: 503, error: 'Integração Meta não configurada no servidor.' },
        templates_require_official_channel: {
          status: 400,
          error: 'Templates exigem o canal WhatsApp Oficial (API Meta).',
        },
        whatsapp_official_disconnected: { status: 400, error: 'WhatsApp Oficial desconectado.' },
        upload_session_failed: { status: 502, error: 'Falha ao iniciar upload na Meta.' },
        upload_handle_failed: { status: 502, error: 'Falha ao concluir upload na Meta.' },
      };
      if (code.startsWith('meta_upload_error:'))
        return res.status(502).json({ error: code.slice('meta_upload_error:'.length) });
      if (map[code]) return res.status(map[code].status).json({ error: map[code].error });

      console.error('Template uploadSample:', err);
      res.status(500).json({ error: 'Falha ao enviar amostra' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const { name, category, body, body_examples, footer, header, buttons, copy_code_text } = req.body ?? {};
      const row = await TemplateService.create(req.user!.sub, {
        name: String(name ?? ''),
        category: String(category ?? '').toUpperCase() as WhatsAppTemplateCategory,
        body: String(body ?? ''),
        body_examples: Array.isArray(body_examples) ? body_examples.map(String) : [],
        footer: footer != null ? String(footer) : null,
        header: parseHeader(header),
        buttons: parseButtons(buttons),
        copy_code_text: copy_code_text != null ? String(copy_code_text) : null,
      } satisfies CreateWhatsAppTemplateInput);
      res.status(201).json(row);
    } catch (err: unknown) {
      const code = (err as Error).message;
      const map: Record<string, { status: number; error: string }> = {
        invalid_template_name: {
          status: 400,
          error: 'Nome inválido. Use apenas letras minúsculas, números e underscore (ex.: promo_maio).',
        },
        invalid_template_body: { status: 400, error: 'Corpo da mensagem é obrigatório.' },
        invalid_template_category: { status: 400, error: 'Categoria inválida.' },
        invalid_body_examples: {
          status: 400,
          error: 'Preencha exemplos para todas as variáveis {{1}}, {{2}}, etc. do corpo.',
        },
        invalid_header_sample: {
          status: 400,
          error: 'Envie um ficheiro de amostra para o cabeçalho de imagem, vídeo ou documento.',
        },
        invalid_template_buttons: {
          status: 400,
          error: 'Botões inválidos. Use até 3 respostas rápidas OU até 2 acções (URL/telefone), sem misturar.',
        },
        invalid_button_example: {
          status: 400,
          error: 'Preencha o exemplo da variável na URL do botão.',
        },
        auth_requires_variable: {
          status: 400,
          error: 'Templates de autenticação exigem {{1}} no corpo para o código OTP.',
        },
        templates_require_official_channel: {
          status: 400,
          error: 'Templates exigem o canal WhatsApp Oficial (API Meta).',
        },
        whatsapp_official_disconnected: {
          status: 400,
          error: 'WhatsApp Oficial desconectado. Conecte em Configurações antes de criar templates.',
        },
        meta_template_error: {
          status: 502,
          error: 'A Meta recusou o template. Verifique o texto e tente novamente.',
        },
        meta_sync_failed: { status: 502, error: 'Não foi possível consultar o estado na Meta.' },
      };

      if (code.startsWith('meta_template_error:'))
        return res.status(502).json({ error: code.slice('meta_template_error:'.length) });
      if (map[code]) return res.status(map[code].status).json({ error: map[code].error });

      if (code.includes('Unique constraint'))
        return res.status(409).json({ error: 'Já existe um template com este nome.' });

      console.error('Template create:', err);
      res.status(500).json({ error: 'Falha ao criar template' });
    }
  }

  static async sync(req: AuthRequest, res: Response) {
    try {
      const id = pickId(req.params);
      if (!id) return res.status(400).json({ error: 'ID inválido' });
      const row = await TemplateService.syncById(req.user!.sub, id);
      res.json(row);
    } catch (err: unknown) {
      const code = (err as Error).message;
      if (code === 'not_found') return res.status(404).json({ error: 'Template não encontrado' });
      if (code === 'templates_require_official_channel')
        return res.status(400).json({ error: 'Templates exigem o canal WhatsApp Oficial (API Meta).' });
      if (code === 'whatsapp_official_disconnected')
        return res.status(400).json({ error: 'WhatsApp Oficial desconectado.' });
      if (code === 'meta_sync_failed') return res.status(502).json({ error: 'Não foi possível consultar a Meta.' });

      console.error('Template sync:', err);
      res.status(500).json({ error: 'Falha ao actualizar estado' });
    }
  }
}
