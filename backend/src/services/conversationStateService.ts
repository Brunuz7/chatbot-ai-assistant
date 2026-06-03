import { prisma } from "../lib/prisma.js";
import { EvolutionService } from "./EvolutionService.js";
import { FlowService } from "./FlowService.js";

export class ConversationStateService {

  /*
  ==========================================
  BUSCAR ESTADO
  ==========================================
  */
  static async getState(
    userId: string,
    contactId: string
  ) {
    return await prisma.conversationState.findUnique({
      where: {
        user_id_contact_id: {
          user_id: userId,
          contact_id: contactId
        }
      }
    });
  }

  /*
  ==========================================
  SALVAR NODE ATUAL
  ==========================================
  */
  static async saveCurrentNode(
    userId: string,
    contactId: string,
    flowId: string,
    nodeId: string
  ) {
    return await prisma.conversationState.upsert({
      where: {
        user_id_contact_id: {
          user_id: userId,
          contact_id: contactId
        }
      },
      update: {
        flow_id: flowId,
        current_node_id: nodeId,
      },
      create: {
        user_id: userId,
        contact_id: contactId,
        flow_id: flowId,
        current_node_id: nodeId,
      }
    });
  }

  /*
  ==========================================
  PAUSAR CONVERSA
  ==========================================
  */
  static async pauseConversation(
    userId: string,
    contactId: string,
    reason: string
  ) {
    return await prisma.conversationState.updateMany({
      where: {
        user_id: userId,
        contact_id: contactId
      },
      data: {
        paused: true,
        paused_reason: reason
      }
    });
  }

  /*
  ==========================================
  RETOMAR CONVERSA
  ==========================================
  */
  static async resumeConversation(
    userId: string,
    contactId: string
  ) {
    return await prisma.conversationState.updateMany({
      where: {
        user_id: userId,
        contact_id: contactId
      },
      data: {
        paused: false,
        paused_reason: null
      }
    });
  }

  /*
  ==========================================
  SALVAR CONVERSA PAUSADA
  ==========================================
  */
  static async savePausedConversation(data: {
    userId: string;
    connectionId: string;
    contactId: string;
    phone: string;
    whatsappId: string;
    instanceName: string;
    message: string;
  }) {
    return await prisma.conversationState.upsert({
      where: {
        user_id_contact_id: {
          user_id: data.userId,
          contact_id: data.contactId
        }
      },
      update: {
        paused: true,
        paused_reason: "outside_business_hours",
        pending_message: data.message,
        instance_name: data.instanceName,
        whatsapp_id: data.whatsappId,
        phone_number: data.phone,
        updated_at: new Date()
      },
      create: {
        user_id: data.userId,
        contact_id: data.contactId,
        paused: true,
        paused_reason: "outside_business_hours",
        pending_message: data.message,
        instance_name: data.instanceName,
        whatsapp_id: data.whatsappId,
        phone_number: data.phone,
      }
    });
  }

  /*
  ==========================================
  RETOMAR CONVERSAS PENDENTES
  ==========================================
  */
  static async resumePendingConversations(
    userId: string,
    instanceName: string
  ) {
    const pendingConversations = await prisma.conversationState.findMany({
      where: {
        user_id: userId,
        paused: true,
        paused_reason: "outside_business_hours"
      }
    });

    for (const convo of pendingConversations) {
      try {
        /*
        ==========================================
        SEM MENSAGEM
        ==========================================
        */
        if (!convo.pending_message) {
          continue;
        }

        /*
        ==========================================
        AVISO DE RETORNO
        ==========================================
        */
        await EvolutionService.sendMessage(instanceName, {
          number: convo.whatsapp_id ?? "",
          text: "Olá! Voltamos ao atendimento 😊",
          delay: 1000,
          linkPreview: false
        });

        /*
        ==========================================
        PROCESSA A MENSAGEM NO FLOW
        ==========================================
        */
        const result = await FlowService.processMessage({
          userId: convo.user_id,
          phone: convo.phone_number || "",
          whatsappId: convo.whatsapp_id || "",
          message: convo.pending_message,
          body: "",
          type: "messages.upsert"
        });

        /*
        ==========================================
        ENVIA RESPOSTAS
        ==========================================
        */
        for (const item of result.outbound || []) {
          /*
          ==========================================
          TEXTO
          ==========================================
          */
          if (item.kind === "text") {
            await EvolutionService.sendMessage(
              instanceName,
              {
                number: convo.whatsapp_id ?? "",
                text: item.text,
                delay: Number(item.delayMs || 1200),
                linkPreview: false
              }
            );
          }

          /*
          ==========================================
          BOTÕES
          ==========================================
          */
          else if (item.kind === "buttons") {
            await EvolutionService.sendButtons(
              instanceName,
              convo.whatsapp_id || "",
              item
            );
          }
        }

        /*
        ==========================================
        REMOVE PAUSE
        ==========================================
        */
        await prisma.conversationState.update({
          where: {
            id: convo.id
          },
          data: {
            paused: false,
            paused_reason: null,
            pending_message: null
          }
        });

        /*
        ==========================================
        REMOVE FLAG DE FORA DO HORÁRIO
        ==========================================
        */
        await prisma.userContact.update({
          where: {
            id: convo.contact_id
          },
          data: {
            outside_hours_notified: false
          }
        });

      } catch (error) {
        console.error("Erro ao retomar conversa:", error);
      }
    }
  }
}