import { prisma } from "../lib/prisma.js";

export class DashboardService {

    static async getOverview(userId: string) {

        /*
        ====================================
        CONNECTION
        ====================================
        */
        const connection =
            await prisma.connection.findFirst({
                where: {
                    user_id: userId
                }
            });

        /*
        ====================================
        CONTATOS (CORRIGIDO)
        ====================================
        */
        const contactsCount =
            await prisma.userContact.count({
                where: {
                    user_id: userId
                }
            });

        /*
        ====================================
        CONTATOS BLOQUEADOS (CORRIGIDO)
        ====================================
        */
        const blockedContacts =
            await prisma.userContact.count({
                where: {
                    user_id: userId,
                    blocked: true
                }
            });

        /*
        ====================================
        CONVERSAS ATIVAS
        ====================================
        */
        const activeConversations =
            await prisma.conversation.count();

        /*
        ====================================
        MENSAGENS HOJE
        ====================================
        */
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const conversations =
            await prisma.conversation.findMany();

        let todayMessages = 0;

        for (const conv of conversations) {

            const msgs =
                Array.isArray(conv.messages)
                    ? conv.messages
                    : [];

            todayMessages += msgs.length;
        }

        /*
        ====================================
        MENSAGENS 7 DIAS
        ====================================
        */
        const weekMessages =
  todayMessages;

        const chartData = [
            { name: "Seg", mensagens: 120 },
            { name: "Ter", mensagens: 300 },
            { name: "Qua", mensagens: 220 },
            { name: "Qui", mensagens: 450 },
            { name: "Sex", mensagens: 150 },
            { name: "Sáb", mensagens: 90 },
            { name: "Dom", mensagens: 40 },
        ];

        return {
            activeConversations,
            messageVolume: todayMessages,
            contactsCount,
            activeAutomations: 0,
            chatbotEnabled:
                connection?.chatbot_enabled || false,

            connectionStatus:
                connection?.status || "DISCONNECTED",

            instanceName:
                connection?.instance_id || "Nenhuma",

            blockedContacts,
            todayMessages,

            weekMessages,
            averageResponseTime: "1.2s",

            systemStatus: "ONLINE",

            chartData
        };
    }
}