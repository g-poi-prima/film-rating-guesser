import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { getEnv } from "@/utils";
import { authenticate } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/asyncHandler";
import { JWT_EXPIRES_IN, BCRYPT_ROUNDS } from "@/constants";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();

// Cache once at module load
const JWT_SECRET = getEnv("JWT_SECRET");

// ── Register ──────────────────────────────────────────────────────────────────

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      res.status(400).json({ error: "Tutti i campi sono obbligatori" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "La password deve essere di almeno 6 caratteri" });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      res.status(409).json({ error: "Username o email già in uso" });
      return;
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
      select: { id: true, username: true, email: true, role: true },
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.status(201).json({ user, token });
  })
);

// ── Login ─────────────────────────────────────────────────────────────────────

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: "Inserisci username e password" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: "Credenziali non valide" });
      return;
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token,
    });
  })
);

// ── Me ────────────────────────────────────────────────────────────────────────

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, email: true, role: true, avatar: true, createdAt: true },
    });
    res.json(user);
  })
);

export default router;
