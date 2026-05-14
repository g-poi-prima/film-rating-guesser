import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, username: true, email: true, role: true, avatar: true, createdAt: true },
  });

  const stats = await prisma.game.aggregate({
    where: { userId: req.user!.id },
    _sum: { score: true },
    _count: { id: true },
  });

  res.json({
    ...user,
    totalScore: stats._sum.score || 0,
    gamesPlayed: stats._count.id,
  });
});

router.put("/", async (req: AuthRequest, res) => {
  const { username, email, password, avatar } = req.body;

  const data: Record<string, string> = {};
  if (username) data.username = username;
  if (email) data.email = email;
  if (avatar) data.avatar = avatar;
  if (password) data.password = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { id: true, username: true, email: true, role: true, avatar: true },
    });
    res.json(user);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      res.status(409).json({ error: "Username o email già in uso" });
      return;
    }
    res.status(500).json({ error: "Errore nell'aggiornamento del profilo" });
  }
});

export default router;
