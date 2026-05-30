import { Response } from "express";
import { SystemLogService } from "../services/SystemLogService.js";
import type { AuthRequest } from "../types/auth.types.js";

export class SystemLogController {
  static async getLogs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado"
        });
      }

      const logs = await SystemLogService.getLogs(userId);

      return res.json(logs);
    } catch (error) {
      console.error("Erro no controller de logs:", error);
      return res.status(500).json({
        error: "Erro ao buscar logs"
      });
    }
  }
}