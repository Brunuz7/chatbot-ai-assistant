import { prisma } from '../lib/prisma.js';

export class SettingsService {
  /*
  Buscar configurações do usuário
  */
  static async getSettings(userId: string) {
    const settings = await prisma.user_setting.findUnique({
      where: {
        user_id: userId
      }
    });

    return settings;
  }

  /*
  Criar ou atualizar configurações
  */
  static async updateSettings(
    userId: string,
    companyName: string,
    notificationEmail: string
  ) {
    const settings = await prisma.user_setting.upsert({
      where: {
        user_id: userId
      },

      update: {
        company_name: companyName,
        notification_email: notificationEmail
      },

      create: {
        user_id: userId,
        company_name: companyName,
        notification_email: notificationEmail,

        // obrigatório porque no prisma esses campos não são nullable
        working_hours: {},
        holidays: {}
      }
    });

    return settings;
  }
}