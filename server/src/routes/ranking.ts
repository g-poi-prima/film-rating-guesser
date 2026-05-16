import { Router } from "express";
import prisma from "@/lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const stats = await prisma.game.groupBy({
    by: ["userId"],
    _sum: { score: true },
    _count: { id: true },
    _avg: { score: true },
    orderBy: { _sum: { score: "desc" } },
  });

  const userIds = stats.map((s) => s.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, avatar: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const data = stats
    .filter((s) => s._count.id > 0)
    .map((s) => {
      const user = userMap.get(s.userId);
      return {
        id: s.userId,
        username: user?.username ?? "Unknown",
        avatar: user?.avatar ?? null,
        gamesPlayed: s._count.id,
        totalScore: s._sum.score ?? 0,
        averageScore: Math.round(s._avg.score ?? 0),
      };
    });

  res.json(data);
});

export default router;
