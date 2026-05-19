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
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      player1: { select: { id: true, username: true, avatar: true } },
      player2: { select: { id: true, username: true, avatar: true } },
    },
  });

  // Normalise so the caller always sees "me" vs "opponent"
  const data = matches.map((m) => {
    const iAmPlayer1 = m.player1Id === userId;
    return {
      id: m.id,
      movieTitle: m.movieTitle,
      moviePoster: m.moviePoster,
      realRating: m.realRating,
      myRating: iAmPlayer1 ? m.player1Rating : m.player2Rating,
      myScore: iAmPlayer1 ? m.player1Score : m.player2Score,
      opponent: iAmPlayer1 ? m.player2 : m.player1,
      opponentRating: iAmPlayer1 ? m.player2Rating : m.player1Rating,
      opponentScore: iAmPlayer1 ? m.player2Score : m.player1Score,
      createdAt: m.createdAt,
    };
  });

  res.json(data);
});

export default router;
