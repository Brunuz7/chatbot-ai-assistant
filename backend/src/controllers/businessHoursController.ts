import { Response } from "express";
import { BusinessHoursService } from "../services/businessHoursService.js";
import type { AuthRequest } from "../types/auth.types.js";
import { SystemLogService } from "../services/SystemLogService.js";


export class BusinessHoursController {
  static async getHours(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const hoursData = await BusinessHoursService.getHours(userId);
      return res.json(hoursData);
    } catch (error) {
      console.error("Erro ao obter horários de funcionamento:", error);
      return res.status(500).json({ error: "Erro interno ao buscar horários" });
    }
  }

  static async updateHours(
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

    const {
      workingHours,
      holidays
    } = req.body;

    const updated =
      await BusinessHoursService.updateHours(
        userId,
        {
          workingHours,
          holidays,
        }
      );

    /*
    ====================================
    LOG DE SUCESSO
    ====================================
    */
    await SystemLogService.createLog(
      userId,
      "BUSINESS_HOURS_UPDATED",
      "Horário de funcionamento atualizado com sucesso",
      "SUCCESS"
    );

    return res.json({
      success: true,
      workingHours: updated.working_hours,
      holidays: updated.holidays,
    });

  } catch (error) {

    console.error(
      "Erro ao atualizar horários:",
      error
    );

    /*
    ====================================
    LOG DE ERRO
    ====================================
    */
    await SystemLogService.createLog(
      req.user?.sub || null,
      "BUSINESS_HOURS_ERROR",
      "Erro ao atualizar horário de funcionamento",
      "ERROR"
    );

    return res.status(500).json({
      error: "Erro interno ao salvar horários"
    });

  }
}
  static async checkStatus(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const open = await BusinessHoursService.isWithinWorkingHours(userId);
      return res.json({ open });
    } catch (error) {
      return res.status(500).json({ error: "Erro ao validar status de expediente" });
    }
  }
}