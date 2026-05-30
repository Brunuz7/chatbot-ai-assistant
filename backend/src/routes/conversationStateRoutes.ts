import { Router } from "express";
import { ConversationStateController } from "../controllers/conversationStateController.js";

const router = Router();

/*
==========================================
BUSCAR ESTADO
==========================================
*/
router.get(
  "/:userId/:contactId",
  ConversationStateController.getState
);

/*
==========================================
PAUSAR CONVERSA
==========================================
*/
router.post(
  "/pause",
  ConversationStateController.pauseConversation
);

/*
==========================================
RETOMAR CONVERSA
==========================================
*/
router.post(
  "/resume",
  ConversationStateController.resumeConversation
);

/*
==========================================
SALVAR NODE
==========================================
*/
router.post(
  "/save-node",
  ConversationStateController.saveCurrentNode
);

export default router;