import { prisma } from '../lib/prisma.js';

export class AppService {
  static async getConnections() {
    return await prisma.connection.findMany();
  }

  static async getAutomations() {
    return []; // No automation model in schema
  }

  static async getKnowledge() {
    return await prisma.knowledgeBase.findMany();
  }

  static async getContacts() {
    return await prisma.userContact.findMany();
  }
}
