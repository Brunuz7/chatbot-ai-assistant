import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { UserContactService } from '../services/UserContactService.js';

export class BlockedController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const contacts = await UserContactService.listBlocked(req.user!.sub);
      res.json(contacts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async block(req: AuthRequest, res: Response) {
    try {
      const { phoneNumber, observation } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          message: 'Número de telefone é obrigatório',
        });
      }

      const blocked = await UserContactService.blockByPhone(req.user!.sub, phoneNumber, observation);
      res.status(201).json(blocked);
    } catch (err: any) {
      if (err.message === 'already_blocked') {
        return res.status(400).json({
          message: 'Contact already blocked',
        });
      }
      res.status(500).json({ error: err.message });
    }
  }

  static async unblock(req: AuthRequest, res: Response) {
    try {
      const result = await UserContactService.unblockContact(req.user!.sub, String(req.params.id));
      return res.json({
        message: 'Contact unblocked successfully',
        contact: result,
      });
    } catch (err: any) {
      if (err.message === 'not_found') {
        return res.status(404).json({ message: 'Contact not found' });
      }
      return res.status(500).json({
        message: 'Error occurred while unblocking contact',
      });
    }
  }
}
