

import { prisma } from "../lib/prisma.js";

export class SystemLogService {

  /*
  ====================================
  CRIAR LOG
  ====================================
  */
  static async createLog(
    userId: string | null,
    action: string,
    description: string,
    level: "INFO" | "SUCCESS" | "WARN" | "ERROR" = "INFO"
  ) {

    /*
    ====================================
    FILTRO DE LOGS DESNECESSÁRIOS
    ====================================
    */
    const ignoredActions = [
      "MESSAGE_RECEIVED",
      "MESSAGE_SENT",
      "CONTACT_CHAT",
      "NEW_CONTACT",
      "WEBHOOK_RECEIVED",
    ];

    if (
      ignoredActions.includes(action) ||
      action.toLowerCase().includes("message") ||
      action.toLowerCase().includes("contact")
    ) {
      return;
    }

    try {

      await prisma.system_log.create({
        data: {
          user_id: userId,
          action,
          description,
          level,
        },
      });

    } catch (error) {

      console.error(
        "Erro ao salvar log:",
        error
      );

    }
  }

  /*
  ====================================
  BUSCAR LOGS
  ====================================
  */
  static async getLogs(userId: string) {

    return prisma.system_log.findMany({
      where: {
        user_id: userId,
      },

      orderBy: {
        created_at: "desc",
      },

      take: 100,
    });

  }
}