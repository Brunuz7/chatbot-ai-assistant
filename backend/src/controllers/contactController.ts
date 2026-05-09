
import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../types/authTypes.js';

export class ContactController {
   static async getContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'Usuário não autenticado'
        });
      }

      const contacts = await prisma.UserContact.findMany({
        where: {
          user_id: userId
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return res.json(contacts);

    } catch (error) {
      console.error('Erro ao buscar contatos:', error);

      return res.status(500).json({
        error: 'Erro ao buscar contatos'
      });
    }
  }
}