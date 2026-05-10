import { Response } from 'express';
import type { AuthRequest } from '../types/authTypes.js';
import { FlowService } from '../services/FlowService.js';
import { prisma } from '../lib/prisma.js';

function logFlowError(action: string, err: unknown) {
  console.error(`[FlowController] ${action}`, err);
}

export class FlowController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const agentId = req.params.agentId as string;
      // Verify agent belongs to user
      const agent = await prisma.agent.findFirst({ where: { id: agentId, user_id: req.user!.sub } });
      if (!agent) return res.status(404).json({ error: 'Agente não encontrado.' });

      const flows = await FlowService.list(agentId);
      res.json(flows);
    } catch (err: unknown) {
      logFlowError('list', err);
      res.status(500).json({ error: 'Não foi possível carregar os roteiros.' });
    }
  }

  static async listAll(req: AuthRequest, res: Response) {
    try {
      const flows = await FlowService.listAll(req.user!.sub);
      res.json(flows);
    } catch (err: unknown) {
      logFlowError('listAll', err);
      res.status(500).json({ error: 'Não foi possível carregar os roteiros.' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const agentId = req.params.agentId as string;
      const agent = await prisma.agent.findFirst({ where: { id: agentId, user_id: req.user!.sub } });
      if (!agent) return res.status(404).json({ error: 'Agente não encontrado.' });

      const flow = await FlowService.create(agentId, req.body);
      res.status(201).json(flow);
    } catch (err: unknown) {
      logFlowError('create', err);
      res.status(500).json({ error: 'Não foi possível criar o roteiro. Tente novamente.' });
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
        return res.status(404).json({ error: 'Roteiro não encontrado.' });
      }

      const flow = await FlowService.update(flowId, req.body);
      res.json(flow);
    } catch (err: unknown) {
      logFlowError('update', err);
      res.status(500).json({ error: 'Não foi possível atualizar o roteiro. Tente novamente.' });
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
        return res.status(404).json({ error: 'Roteiro não encontrado.' });
      }

      await FlowService.delete(flowId);
      res.json({ success: true });
    } catch (err: unknown) {
      logFlowError('delete', err);
      res.status(500).json({ error: 'Não foi possível eliminar o roteiro. Tente novamente.' });
    }
  }
}
