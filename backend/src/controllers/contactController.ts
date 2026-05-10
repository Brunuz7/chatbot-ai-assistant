

import { Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../types/auth.types.js";

export class ContactController {
  /*
  =========================
  LISTAR CONTATOS
  =========================
  */
  static async getContacts(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado"
        });
      }

      await prisma.user_contact.updateMany({
        where: {
          user_id: userId,
          blocked: true,
          blocked_until: {
            not: null,
            lte: new Date()
          }
        },
        data: {
          blocked: false,
          block_reason: null,
          blocked_at: null,
          blocked_until: null
        }
      });

      const contacts = await prisma.user_contact.findMany({
        where: {
          user_id: userId,
          blocked: false
        },
        orderBy: {
          created_at: "desc"
        }
      });

      return res.json(contacts);

    } catch (error) {
      console.error("Erro ao buscar contatos:", error);

      return res.status(500).json({
        error: "Erro ao buscar contatos"
      });
    }
  }
  /*
  =========================
  LISTAR BLOQUEADOS
  =========================
  */
  static async getBlockedContacts(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado"
        });
      }

      const contacts = await prisma.user_contact.findMany({
        where: {
          user_id: userId,
          blocked: true
        },
        orderBy: {
          updated_at: "desc"
        }
      });

      return res.json(contacts);

    } catch (error) {
      console.error("Erro ao buscar bloqueados:", error);

      return res.status(500).json({
        error: "Erro ao buscar bloqueados"
      });
    }
  }

  /*
  =========================
  BLOQUEAR CONTATO
  =========================
  */
  static async blockContact(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const id = String(req.params.id);

      const {
        reason,
        blockHours,
        blockedUntil
      } = req.body;

      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado"
        });
      }

      const existingContact =
        await prisma.user_contact.findFirst({
          where: {
            id,
            user_id: userId
          }
        });

      if (!existingContact) {
        return res.status(404).json({
          error: "Contato não encontrado"
        });
      }

      let finalBlockedUntil = null;

      /*
      PRIORIDADE 1:
      se frontend enviar data manual
      */
      if (blockedUntil) {
        finalBlockedUntil = new Date(blockedUntil);
        console.log("blockedUntil:", blockedUntil);
        console.log("finalBlockedUntil:", finalBlockedUntil);
        console.log(
          "isValid:",
          !isNaN(finalBlockedUntil.getTime())
        );
      }

      /*
      PRIORIDADE 2:
      fallback para blockHours
      */
      else if (blockHours) {
        finalBlockedUntil = new Date();
        finalBlockedUntil.setHours(
          finalBlockedUntil.getHours() + Number(blockHours)
        );
      }

      /*
      PRIORIDADE 3:
      fallback padrão
      */
      else {
        finalBlockedUntil = new Date();
        finalBlockedUntil.setHours(
          finalBlockedUntil.getHours() + 24
        );
      }

      const contact =
        await prisma.user_contact.update({
          where: {
            id
          },
          data: {
            blocked: true,
            block_reason:
              reason || "Bloqueado manualmente",
            blocked_at: new Date(),
            blocked_until: finalBlockedUntil
          }
        });

      return res.json({
        message: "Contato bloqueado com sucesso",
        contact
      });

    } catch (error) {
      console.error(
        "Erro ao bloquear contato:",
        error
      );

      return res.status(500).json({
        error: "Erro ao bloquear contato"
      });
    }
  }
  /*
  =========================
  DESBLOQUEAR CONTATO
  =========================
  */
  static async unblockContact(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado"
        });
      }

      const existingContact = await prisma.user_contact.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!existingContact) {
        return res.status(404).json({
          error: "Contato não encontrado"
        });
      }

      const contact = await prisma.user_contact.update({
        where: {
          id
        },
        data: {
          blocked: false,
          block_reason: null,
          blocked_at: null,
          blocked_until: null
        }
      });

      return res.json({
        message: "Contato desbloqueado com sucesso",
        contact
      });

    } catch (error) {
      console.error("Erro ao desbloquear contato:", error);

      return res.status(500).json({
        error: "Erro ao desbloquear contato"
      });
    }
  }
}