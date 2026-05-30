import { Router } from "express";
import { ContactController } from "../controllers/contactController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Como o principal já usa router.use("/contacts", contactRouter)
// Esta rota responderá perfeitamente em: GET /contacts
router.get("/", requireAuth, ContactController.getContacts);

export default router;