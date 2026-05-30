import { Router } from "express";
import { SystemLogController } from "../controllers/systemLogController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/logs
router.get("/", requireAuth, SystemLogController.getLogs);

export default router;