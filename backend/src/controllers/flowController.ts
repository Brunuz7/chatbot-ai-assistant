import { Response } from 'express';
import type { AuthRequest } from '../types/auth.types.js';
import { FlowService } from '../services/FlowService.js';
import { prisma } from '../lib/prisma.js';

export class FlowController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const agentId = req.params.agentId as string;
      // Verify agent belongs to user
      const agent = await prisma.agent.findFirst({ where: { id: agentId, user_id: req.user!.sub } });
      if (!agent) return res.status(404).json({ error: 'Agent not found' });

      const flows = await FlowService.list(agentId);
      res.json(flows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listAll(req: AuthRequest, res: Response) {
    try {
      const flows = await FlowService.listAll(req.user!.sub);
      res.json(flows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const agentId = req.params.agentId as string;
      const agent = await prisma.agent.findFirst({ where: { id: agentId, user_id: req.user!.sub } });
      if (!agent) return res.status(404).json({ error: 'Agent not found' });

      const flow = await FlowService.create(agentId, req.body);
      res.status(201).json(flow);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const flowId = req.params.flowId as string;
      const flowEntity = await prisma.flow.findFirst({
        where: { id: flowId },
        include: { agent: true }
      });
      if (!flowEntity || !flowEntity.agent || flowEntity.agent.user_id !== req.user!.sub) {
        return res.status(404).json({ error: 'Flow not found' });
      }

      const flow = await FlowService.update(flowId, req.body);
      res.json(flow);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const flowId = req.params.flowId as string;
      const flowEntity = await prisma.flow.findFirst({
        where: { id: flowId },
        include: { agent: true }
      });
      if (!flowEntity || !flowEntity.agent || flowEntity.agent.user_id !== req.user!.sub) {
        return res.status(404).json({ error: 'Flow not found' });
      }

      await FlowService.delete(flowId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
