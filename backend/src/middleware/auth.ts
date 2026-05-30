import { Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth.js";
import type { AuthRequest } from "../types/auth.types.js";

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    console.log("HEADER RECEBIDO:", authHeader);

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        error: "missing_token",
        message: "Token não enviado",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "missing_token",
      });
    }

    const payload = verifyAccessToken(token);

    console.log("PAYLOAD:", payload);

    if (!payload) {
      return res.status(401).json({
        error: "invalid_token",
      });
    }

    req.user = {
      sub: payload.sub,
      email: payload.email,
    };

    next();
  } catch (error) {
    console.error("ERRO AUTH:", error);

    return res.status(401).json({
      error: "auth_failed",
    });
  }
}