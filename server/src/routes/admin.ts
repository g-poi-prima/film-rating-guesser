import { Router } from "express";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/admin";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/users", async (_req: AuthRequest, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
      _count: { select: { games: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(users);
});

router.put("/users/:id/role", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id!);
  const { role } = req.body;

  if (role !== "USER" && role !== "ADMIN") {
    res.status(400).json({ error: "Ruolo non valido" });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, username: true, email: true, role: true },
  });

  res.json(user);
});

router.delete("/users/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id!);

  if (id === req.user!.id) {
    res.status(400).json({ error: "Non puoi eliminare te stesso" });
    return;
  }

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } }),
    prisma.match.deleteMany({ where: { OR: [{ player1Id: id }, { player2Id: id }] } }),
    prisma.game.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  res.json({ message: "Utente eliminato" });
});

export default router;
