import { prisma } from '../lib/prisma.js';

export class AppService {
  static async getConnections() {
    return await prisma.connection.findMany();
  }

  static async getAutomations() {
    return await prisma.automation.findMany();
  }

  static async getKnowledge() {
    return await prisma.knowledgeBase.findMany();
  }

  static async getContacts() {
    return await prisma.contact.findMany();
  }
}
