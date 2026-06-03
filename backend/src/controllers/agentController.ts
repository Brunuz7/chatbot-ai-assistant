import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { AgentService } from '../services/AgentService.js';

export class AgentController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const agents = await AgentService.list(req.user!.sub);
      res.json(agents);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const agent = await AgentService.getById(req.params.id as string, req.user!.sub);
      if (!agent) return res.status(404).json({ error: 'Not found' });
      res.json(agent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const agent = await AgentService.create(req.user!.sub, req.body);
      res.status(201).json(agent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const agent = await AgentService.update(req.params.id as string, req.user!.sub, req.body);
      res.json(agent);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      await AgentService.delete(req.params.id as string, req.user!.sub);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
