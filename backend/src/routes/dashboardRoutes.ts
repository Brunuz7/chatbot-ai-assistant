import { Router } from "express";
import { DashboardController } from "../controllers/dashboardController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get(
  "/overview",
  requireAuth,
  DashboardController.overview
);

export default router;