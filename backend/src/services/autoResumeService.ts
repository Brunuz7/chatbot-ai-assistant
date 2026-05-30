import { prisma } from "../lib/prisma.js";
import { BusinessHoursService } from "./businessHoursService.js";
import { ConversationStateService } from "./conversationStateService.js";

export class AutoResumeService {

    /*
    ==========================================
    RETOMAR CONVERSAS AUTOMATICAMENTE
    ==========================================
    */
    static async execute() {

        console.log("AUTO RESUME EXECUTANDO");

        const connections =
            await prisma.connection.findMany({
                where: {
                    chatbot_enabled: true,

                    status: {
                        in: [
                            "CONNECTED",
                            "open",
                            "OPEN"
                        ]
                    }
                }
            });

        console.log("CONNECTIONS:", connections);

        for (const connection of connections) {

            console.log("PROCESSANDO:", connection.instance_id);

            try {

                const isOpen =
                    await BusinessHoursService.isWithinWorkingHours(
                        connection.user_id
                    );

                console.log("LOJA ABERTA?", isOpen);

                if (!isOpen) {
                    continue;
                }

                await ConversationStateService.resumePendingConversations(
                    connection.user_id,
                    connection.instance_id
                );

            } catch (error) {

                console.error(
                    "Erro AutoResumeService:",
                    error
                );
            }
        }
    }
}