import { Router } from "express";
import prisma from "@/lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const rankings = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      avatar: true,
      _count: { select: { games: true } },
      games: {
        select: { score: true },
      },
    },
  });

  const data = rankings
    .map((u) => {
      const totalScore = u.games.reduce((sum, g) => sum + g.score, 0);
      return {
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        gamesPlayed: u._count.games,
        totalScore,
        averageScore: u._count.games > 0 ? Math.round(totalScore / u._count.games) : 0,
      };
    })
    .filter((u) => u.gamesPlayed > 0)
    .sort((a, b) => b.totalScore - a.totalScore);

  res.json(data);
});

export default router;
