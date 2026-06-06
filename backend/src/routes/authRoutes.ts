import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { AuthController } from '../controllers/AuthController.js';

const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

router.get('/me', requireAuth, AuthController.me);
router.patch('/me', requireAuth, AuthController.updateMe);
router.get('/protected', requireAuth, AuthController.protected);

export default router;
