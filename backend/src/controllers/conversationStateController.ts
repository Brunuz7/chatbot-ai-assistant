import { Request, Response } from "express";
import { ConversationStateService } from "../services/conversationStateService.js";

export class ConversationStateController {

  /*
  ==========================================
  BUSCAR ESTADO DA CONVERSA
  ==========================================
  */
  static async getState(
    req: Request,
    res: Response
  ) {

    try {

      const { userId, contactId } = req.params;

      const state =
        await ConversationStateService.getState(
          userId as string,
          contactId as string
        );

      return res.json({
        success: true,
        data: state
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Erro ao buscar estado da conversa"
      });
    }
  }

  /*
  ==========================================
  PAUSAR CONVERSA
  ==========================================
  */
  static async pauseConversation(
    req: Request,
    res: Response
  ) {

    try {

      const {
        userId,
        contactId,
        reason
      } = req.body;

      await ConversationStateService.pauseConversation(
        userId as string,
        contactId as string,
        reason || "manual_pause"
      );

      return res.json({
        success: true,
        message: "Conversa pausada"
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Erro ao pausar conversa"
      });
    }
  }

  /*
  ==========================================
  RETOMAR CONVERSA
  ==========================================
  */
  static async resumeConversation(
    req: Request,
    res: Response
  ) {

    try {

      const {
        userId,
        contactId
      } = req.body;

      await ConversationStateService.resumeConversation(
        userId as string,
        contactId
      );

      return res.json({
        success: true,
        message: "Conversa retomada"
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Erro ao retomar conversa"
      });
    }
  }

  /*
  ==========================================
  SALVAR NODE ATUAL
  ==========================================
  */
  static async saveCurrentNode(
    req: Request,
    res: Response
  ) {

    try {

      const {
        userId,
        contactId,
        flowId,
        nodeId
      } = req.body;

      const result =
        await ConversationStateService.saveCurrentNode(
          userId,
          contactId,
          flowId,
          nodeId
        );

      return res.json({
        success: true,
        data: result
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Erro ao salvar node atual"
      });
    }
  }
}