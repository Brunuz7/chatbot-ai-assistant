import { Request, Response } from 'express';
import { LogsService } from '../services/logsService.js';

export class LogsController {
    static async getLogs(req: Request, res: Response) {
        try {
            const logs = await LogsService.getLogs();

            return res.json(logs);
        }catch (error) {
            return res.status(500).json({
                error: "Erro ao buscar logs"
            });
        }
    }
}