import { Response } from "express";
import type { AuthRequest } from "../types/authTypes.js";
import { BlockedService } from "../services/BlockedService.js";

export class BlockedController {
  static async getBlockedContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado",
        });
      }

      const contacts = await BlockedService.listBlocked(userId);

      return res.json(contacts);
    } catch (error) {
      console.error("Erro ao buscar bloqueados:", error);

      return res.status(500).json({
        error: "Erro ao buscar bloqueados",
      });
    }
  }

  static async blockContact(req: AuthRequest, res: Response) {
    try {
      const id = String(req.params.id);

      const {
        reason,
        blockHours,
        blockedUntil,
      } = req.body;

      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado",
        });
      }

      const contact = await BlockedService.block(
        id,
        userId,
        {
          reason,
          blockHours,
          blockedUntil,
        }
      );

      return res.json({
        message: "Contato bloqueado com sucesso",
        contact,
      });
    } catch (error: any) {
      console.error(
        "Erro ao bloquear contato:",
        error
      );

      if (
        error.message ===
        "contact_not_found"
      ) {
        return res.status(404).json({
          error: "Contato não encontrado",
        });
      }

      return res.status(500).json({
        error: "Erro ao bloquear contato",
      });
    }
  }

  static async unblockContact(
    req: AuthRequest,
    res: Response
  ) {
    try {
      const id = String(req.params.id);

      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado",
        });
      }

      const contact =
        await BlockedService.unblock(
          id,
          userId
        );

      return res.json({
        message:
          "Contato desbloqueado com sucesso",
        contact,
      });
    } catch (error: any) {
      console.error(
        "Erro ao desbloquear contato:",
        error
      );

      if (
        error.message ===
        "contact_not_found"
      ) {
        return res.status(404).json({
          error: "Contato não encontrado",
        });
      }

      return res.status(500).json({
        error:
          "Erro ao desbloquear contato",
      });
    }
  }
}