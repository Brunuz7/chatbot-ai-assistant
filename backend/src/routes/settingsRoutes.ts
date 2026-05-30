import { Router } from "express";
import { SettingsController } from "../controllers/settingsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, SettingsController.getSettings);

// Altere de .put para .post se o seu front insistir em enviar um POST:
router.post("/", requireAuth, SettingsController.updateSettings); 

export default router;