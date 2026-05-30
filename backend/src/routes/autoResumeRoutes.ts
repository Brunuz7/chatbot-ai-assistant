import { Router } from "express";
import { AutoResumeController } from "../controllers/autoResumeController.js";

const router = Router();

router.post(
  "/execute",
  AutoResumeController.execute
);

export default router;