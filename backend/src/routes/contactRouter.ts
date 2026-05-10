import { Router } from "express";
import { ContactController } from "../controllers/contactController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/*
=========================
LISTAR CONTATOS
=========================
*/
router.get(
  "/",
  requireAuth,
  ContactController.getContacts
);

/*
=========================
BLOQUEAR CONTATO
=========================
*/
router.patch(
  "/:id/block",
  requireAuth,
  ContactController.blockContact
);

/*
=========================
DESBLOQUEAR CONTATO
=========================
*/
router.patch(
  "/:id/unblock",
  requireAuth,
  ContactController.unblockContact
);

/*
=========================
LISTAR BLOQUEADOS
=========================
*/
router.get(
  "/blocked",
  requireAuth,
  ContactController.getBlockedContacts
);

export default router;