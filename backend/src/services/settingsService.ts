import { prisma } from "../lib/prisma.js";

export class SettingsService {
  static async getSettings(userId: string) {
    return await prisma.user_setting.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        company_name: true,
        notification_email: true,
        chatbot_enabled: true,
        delay_seconds: true,
        account_token: true,
        working_hours: true,
        created_at: true,
        updated_at: true,
      }
    });
  }

  static async updateSettings(
    userId: string,
    data: {
      companyName?: string;
      notificationEmail?: string;
      chatbotEnabled?: boolean;
      delaySeconds?: number;
      accountToken?: string;
      workingHours?: any;
    }
  ) {
    const existing = await prisma.user_setting.findUnique({
      where: { user_id: userId },
    });

    let result;

    if (existing) {
      result = await prisma.user_setting.update({
        where: { user_id: userId },
        data: {
          company_name: data.companyName,
          notification_email: data.notificationEmail,
          chatbot_enabled: data.chatbotEnabled,
          delay_seconds: data.delaySeconds,
          account_token: data.accountToken,
          working_hours: data.workingHours,
        },
      });
    } else {
      result = await prisma.user_setting.create({
        data: {
          user_id: userId,
          company_name: data.companyName || "",
          notification_email: data.notificationEmail || "",
          chatbot_enabled: data.chatbotEnabled ?? true,
          delay_seconds: data.delaySeconds ?? 5,
          account_token: data.accountToken || "",
          working_hours: data.workingHours || null,
          holidays: [],
        },
      });
    }

    // RESOLUÇÃO DO SEU PROBLEMA: Sempre que alterar as configurações/horários, limpa o bloqueio de todos os contatos
    await prisma.user_contact.updateMany({
      where: { user_id: userId },
      data: { outside_hours_notified: false }
    });

    return result;
  }
}