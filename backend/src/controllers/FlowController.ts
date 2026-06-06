import { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { FlowService } from '../services/FlowService.js';
import { prisma } from '../prisma.js';

function logFlowError(action: string, err: unknown) {
  console.error(`[FlowController] ${action}`, err);
}

export class FlowController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const agentId = req.params.agentId as string;
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
      const flow = await FlowService.create(req.user!.sub, req.body as Record<string, unknown>);
      res.status(201).json(flow);
    } catch (err: unknown) {
      logFlowError('create', err);
      res.status(500).json({ error: 'Não foi possível criar o roteiro. Tente novamente.' });
    }
  }

  /** Legado: criar fluxo ligado a um agente (agent_id no body ou URL). */
  static async createForAgent(req: AuthRequest, res: Response) {
    try {
      const agentId = req.params.agentId as string;
      const agent = await prisma.agent.findFirst({ where: { id: agentId, user_id: req.user!.sub } });
      if (!agent) return res.status(404).json({ error: 'Agente não encontrado.' });

      const body = { ...(req.body as Record<string, unknown>), agent_id: agentId };
      const flow = await FlowService.create(req.user!.sub, body);
      res.status(201).json(flow);
    } catch (err: unknown) {
      logFlowError('createForAgent', err);
      res.status(500).json({ error: 'Não foi possível criar o roteiro. Tente novamente.' });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const flowId = req.params.flowId as string;
      const owned = await FlowService.belongsToUser(flowId, req.user!.sub);
      if (!owned) return res.status(404).json({ error: 'Roteiro não encontrado.' });

      const flow = await FlowService.update(flowId, req.user!.sub, req.body as Record<string, unknown>);
      res.json(flow);
    } catch (err: unknown) {
      logFlowError('update', err);
      res.status(500).json({ error: 'Não foi possível atualizar o roteiro. Tente novamente.' });
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const flowId = req.params.flowId as string;
      const owned = await FlowService.belongsToUser(flowId, req.user!.sub);
      if (!owned) return res.status(404).json({ error: 'Roteiro não encontrado.' });

      await FlowService.delete(flowId);
      res.json({ success: true });
    } catch (err: unknown) {
      logFlowError('delete', err);
      res.status(500).json({ error: 'Não foi possível eliminar o roteiro. Tente novamente.' });
    }
  }
}
