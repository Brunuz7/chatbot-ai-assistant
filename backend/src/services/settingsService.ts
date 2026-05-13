import { prisma } from '../lib/prisma.js';

export class SettingsService {
  static async getSettings(userId: string) {
    const settings = await prisma.user_setting.findUnique({
      where: {
        user_id: userId
      }
    });

    return settings;
  }

  static async updateSettings(
    userId: string,
    data: {
      companyName?: string;
      notificationEmail?: string;
    }
  ) {
    const existingSettings = await prisma.user_setting.findUnique({
      where: {
        user_id: userId
      }
    });

    if (existingSettings) {
      return await prisma.user_setting.update({
        where: {
          user_id: userId
        },
        data: {
          company_name: data.companyName,
          notification_email: data.notificationEmail
        }
      });
    }

    return await prisma.user_setting.create({
      data: {
        user_id: userId,
        company_name: data.companyName,
        notification_email: data.notificationEmail,

        // campos obrigatórios do schema
        working_hours: {},
        holidays: []
      }
    });
  }
}