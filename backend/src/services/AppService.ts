import { prisma } from '../lib/prisma.js';

export class AppService {
  static async getConnections() {
    return await prisma.Connection.findMany();
  }

  static async getAutomations() {
    return []; // No automation model in schema
  }

  static async getKnowledge() {
    return await prisma.KnowledgeBase.findMany();
  }

  static async getContacts() {
    return await prisma.UserContact.findMany();
  }
}
