import { Response } from "express";
import { SettingsService } from "../services/settingsService.js";
import type { AuthRequest } from "../types/auth.types.js";

export class SettingsController {
  static async getSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado",
        });
      }

      const settings = await SettingsService.getSettings(userId);

      return res.json(settings);
    } catch (error) {
      console.error("Erro ao buscar settings:", error);

      return res.status(500).json({
        error: "Erro interno ao buscar configurações",
      });
    }
  }

  static async updateSettings(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: "Usuário não autenticado",
        });
      }

      const { companyName, notificationEmail } = req.body;

      const settings = await SettingsService.updateSettings(userId, {
        companyName,
        notificationEmail,
      });

      return res.json(settings);
    } catch (error) {
      console.error("Erro ao atualizar settings:", error);

      return res.status(500).json({
        error: "Erro interno ao salvar configurações",
      });
    }
  }
}