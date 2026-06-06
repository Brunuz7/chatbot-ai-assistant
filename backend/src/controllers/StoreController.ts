import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { StoreService } from '../services/StoreService.js';

export class StoreController {
  static getCloudinaryConfig(_req: AuthRequest, res: Response) {
    try {
      res.json(StoreService.getCloudinaryConfig());
    } catch (err) {
      console.error('Store cloudinary config:', err);
      res.status(500).json({ error: 'Falha ao carregar configuração' });
    }
  }

  static async uploadImage(req: AuthRequest, res: Response) {
    try {
      const row = await StoreService.uploadProductImage(req.user!.sub, {
        buffer: req.file?.buffer,
        mimeType: req.file?.mimetype,
        productName: req.body?.productName,
        slot: req.body?.slot,
      });
      res.status(201).json(row);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg === 'missing_image') return res.status(400).json({ error: 'Imagem obrigatória' });
      if (msg === 'missing_product_name')
        return res.status(400).json({ error: 'Nome do produto é obrigatório para enviar imagem' });
      if (msg === 'invalid_slot') return res.status(400).json({ error: 'Slot de imagem inválido' });
      if (msg === 'invalid_image_type') return res.status(400).json({ error: 'Formato de imagem não suportado' });
      if (msg === 'image_too_large') return res.status(400).json({ error: 'Imagem excede 5 MB' });
      if (msg === 'cloudinary_not_configured')
        return res.status(503).json({ error: 'Cloudinary não configurado no servidor' });
      if (msg === 'cloudinary_upload_failed') return res.status(502).json({ error: 'Falha ao enviar imagem' });

      console.error('Store upload image:', err);
      res.status(500).json({ error: 'Falha ao enviar imagem' });
    }
  }

  static async deleteImage(req: AuthRequest, res: Response) {
    try {
      await StoreService.deleteProductImage(req.user!.sub, req.body ?? {});
      res.status(204).send();
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg === 'invalid_image_ref') return res.status(400).json({ error: 'Referência de imagem inválida' });
      if (msg === 'forbidden_image') return res.status(403).json({ error: 'Imagem não pertence a esta conta' });
      if (msg === 'cloudinary_not_configured')
        return res.status(503).json({ error: 'Cloudinary não configurado no servidor' });
      if (msg === 'cloudinary_delete_failed') return res.status(502).json({ error: 'Falha ao remover imagem' });

      console.error('Store delete image:', err);
      res.status(500).json({ error: 'Falha ao remover imagem' });
    }
  }
}
