import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "@/utils";
import prisma from "@/lib/prisma";

export interface AuthRequest extends Request {
  user?: { id: number; username: string; email: string; role: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token non fornito" });
    return;
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, getEnv("JWT_SECRET")) as { id: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true },
    });
    if (!user) { res.status(401).json({ error: "Utente non trovato" }); return; }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Token non valido" });
  }
}