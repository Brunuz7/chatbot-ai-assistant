import { Router } from "express";
import { BlockedController } from "../controllers/blockedController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, BlockedController.getBlockedContacts);

router.patch("/:id/block", requireAuth, BlockedController.blockContact);

router.patch("/:id/unblock", requireAuth, BlockedController.unblockContact);

export default router;