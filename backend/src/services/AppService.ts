import { prisma } from '../lib/prisma.js';

export class AppService {
  static async getConnections() {
    return await prisma.connection.findMany();
  }

  static async getAutomations() {
    return []; // No automation model in schema
  }

  static async getKnowledge() {
    return await prisma.knowledge_base.findMany();
  }

  static async getContacts() {
    return await prisma.user_contact.findMany();
  }
}
