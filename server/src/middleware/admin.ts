import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Accesso negato. Richiesti privilegi admin." });
    return;
  }
  next();
}
