import { Router } from "express";
import prisma from "@/lib/prisma";

const router = Router();

// Ranking is based on average score per guess across solo games + 1v1 match rounds.
router.get("/", async (_req, res) => {
  // 1. Solo game aggregates per user
  const gameAggs = await prisma.game.groupBy({
    by: ["userId"],
    _sum: { score: true },
    _count: { id: true },
  });

  // 2. Completed match totals per user (player1Score / player2Score are cumulative round scores)
  const completedMatches = await prisma.match.findMany({
    where: { status: "COMPLETED" },
    select: {
      player1Id: true,
      player2Id: true,
      player1Score: true,
      player2Score: true,
      _count: { select: { rounds: true } },
    },
  });

  // Build match-score map: userId → { score, rounds }
  const matchMap = new Map<number, { score: number; rounds: number }>();
  for (const m of completedMatches) {
    const add = (uid: number, score: number | null, rounds: number) => {
      const prev = matchMap.get(uid) ?? { score: 0, rounds: 0 };
      matchMap.set(uid, { score: prev.score + (score ?? 0), rounds: prev.rounds + rounds });
    };
    add(m.player1Id, m.player1Score, m._count.rounds);
    add(m.player2Id, m.player2Score, m._count.rounds);
  }

  // 3. Union of user IDs
  const allUserIds = new Set([
    ...gameAggs.map((a) => a.userId),
    ...Array.from(matchMap.keys()),
  ]);

  if (allUserIds.size === 0) {
    res.json([]);
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(allUserIds) } },
    select: { id: true, username: true, avatar: true },
  });

  const gameMap = new Map(gameAggs.map((a) => [a.userId, { score: a._sum.score ?? 0, count: a._count.id }]));

  const data = users
    .map((u) => {
      const g = gameMap.get(u.id) ?? { score: 0, count: 0 };
      const m = matchMap.get(u.id) ?? { score: 0, rounds: 0 };
      const totalGuesses = g.count + m.rounds;
      const totalScore = g.score + m.score;
      const averageScore = totalGuesses > 0 ? Math.round((totalScore / totalGuesses) * 10) / 10 : 0;
      return {
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        gamesPlayed: g.count,
        matchRoundsPlayed: m.rounds,
        totalScore,
        averageScore,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);

  res.json(data);
});

export default router;
