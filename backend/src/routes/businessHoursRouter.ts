import { Router } from "express";
import { BusinessHoursController } from "../controllers/businessHoursController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, BusinessHoursController.getHours);
router.put("/", requireAuth, BusinessHoursController.updateHours);
router.get("/status", requireAuth, BusinessHoursController.checkStatus);

export default router;