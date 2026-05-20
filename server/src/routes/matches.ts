import { Router } from "express";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/history", async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
      status: { in: ["COMPLETED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      player1: { select: { id: true, username: true, avatar: true } },
      player2: { select: { id: true, username: true, avatar: true } },
      rounds: { orderBy: { roundNumber: "asc" } },
    },
  });

  const data = matches.map((m) => {
    const iAmPlayer1 = m.player1Id === userId;
    return {
      id: m.id,
      status: m.status,
      totalRounds: m.totalRounds,
      roundsPlayed: m.rounds.length,
      myTotalScore: iAmPlayer1 ? m.player1Score : m.player2Score,
      opponentTotalScore: iAmPlayer1 ? m.player2Score : m.player1Score,
      opponent: iAmPlayer1 ? m.player2 : m.player1,
      createdAt: m.createdAt,
      rounds: m.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        movieTitle: r.movieTitle,
        moviePoster: r.moviePoster,
        realRating: r.realRating,
        myRating: iAmPlayer1 ? r.player1Rating : r.player2Rating,
        myScore: iAmPlayer1 ? r.player1Score : r.player2Score,
        opponentRating: iAmPlayer1 ? r.player2Rating : r.player1Rating,
        opponentScore: iAmPlayer1 ? r.player2Score : r.player1Score,
      })),
    };
  });

  res.json(data);
});

export default router;
