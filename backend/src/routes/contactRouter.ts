import { Router } from "express";
import { ContactController } from "../controllers/contactController.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();


// Listar contatos normais
router.get("/", requireAuth, ContactController.getContacts);



// Bloquear contato
router.patch("/:id/block", requireAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : rawId?.[0];
    if (!id) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const { reason, blockHours } = req.body;

    let blockedUntil = null;

    if (blockHours) {
      blockedUntil = new Date(
        Date.now() + blockHours * 60 * 60 * 1000
      );
    }

    const contact = await prisma.userContact.update({
      where: { id },
      data: {
        blocked: true,
        blocked_at: new Date(),
        block_reason: reason,
        blocked_until: blockedUntil
      }
    });

    res.json(contact);

  } catch (error) {
    console.error("Erro ao bloquear contato:", error);

    res.status(500).json({
      error: "Erro ao bloquear contato"
    });
  }
});



// Desbloquear contato
router.patch("/:id/unblock", requireAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = typeof rawId === "string" ? rawId : rawId?.[0];
    if (!id) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }

    const contact = await prisma.userContact.update({
      where: { id },
      data: {
        blocked: false,
        blocked_at: null,
        block_reason: null,
        blocked_until: null
      }
    });

    res.json(contact);

  } catch (error) {
    console.error("Erro ao desbloquear contato:", error);

    res.status(500).json({
      error: "Erro ao desbloquear contato"
    });
  }
});



// Listar contatos bloqueados
router.get("/blocked", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const contacts = await prisma.userContact.findMany({
      where: {
        user_id: userId,
        blocked: true
      },
      orderBy: {
        updated_at: "desc"
      }
    });

    res.json(contacts);

  } catch (error) {
    console.error("Erro ao buscar bloqueados:", error);

    res.status(500).json({
      error: "Erro ao buscar bloqueados"
    });
  }
});

export default router;