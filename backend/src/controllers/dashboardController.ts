import { Request, Response } from "express";
import { DashboardService } from "../services/dashboardService.js";

export class DashboardController {

    static async overview(
        req: Request,
        res: Response
    ) {

        try {

            const userId =
                (req as any).user.id;

            const data =
                await DashboardService.getOverview(
                    userId
                );

            return res.json(data);

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                error: "Erro ao carregar dashboard"
            });

        }
    }
}