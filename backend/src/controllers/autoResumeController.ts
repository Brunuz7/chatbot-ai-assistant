import { Request, Response } from "express";
import { AutoResumeService } from "../services/autoResumeService.js";

export class AutoResumeController {

  static async execute(
    req: Request,
    res: Response
  ) {

    await AutoResumeService.execute();

    return res.json({
      success: true,
      message: "Retomada executada com sucesso"
    });
  }
}