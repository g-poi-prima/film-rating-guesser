import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/asyncHandler";
import { BCRYPT_ROUNDS } from "@/constants";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();
router.use(authenticate);

// ── Get profile ───────────────────────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.user!.id;

    const [user, gameStats, matches, friendCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, email: true, role: true, avatar: true, createdAt: true },
      }),
      prisma.game.aggregate({
        where: { userId },
        _sum: { score: true },
        _count: { id: true },
      }),
      prisma.match.findMany({
        where: { OR: [{ player1Id: userId }, { player2Id: userId }], status: "COMPLETED" },
        select: {
          player1Id: true,
          player1Score: true,
          player2Score: true,
          _count: { select: { rounds: true } },
        },
      }),
      prisma.friendRequest.count({
        where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] },
      }),
    ]);

    let matchWins = 0;
    let matchLosses = 0;
    let matchDraws = 0;
    let matchRoundsPlayed = 0;
    let matchTotalScore = 0;

    for (const m of matches) {
      const iAmP1 = m.player1Id === userId;
      const myScore = iAmP1 ? m.player1Score : m.player2Score;
      const oppScore = iAmP1 ? m.player2Score : m.player1Score;
      matchRoundsPlayed += m._count.rounds;
      matchTotalScore += myScore ?? 0;
      if (myScore === null || oppScore === null) continue;
      if (myScore > oppScore) matchWins++;
      else if (myScore < oppScore) matchLosses++;
      else matchDraws++;
    }

    res.json({
      ...user,
      totalScore: (gameStats._sum.score ?? 0) + matchTotalScore,
      gamesPlayed: gameStats._count.id,
      matchesPlayed: matches.length,
      matchWins,
      matchLosses,
      matchDraws,
      matchRoundsPlayed,
      friendCount,
    });
  })
);

// ── Update profile ────────────────────────────────────────────────────────────

router.put(
  "/",
  asyncHandler(async (req: AuthRequest, res) => {
    const { username, email, password, avatar } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      avatar?: string;
    };

    const data: Record<string, string> = {};
    if (username) data.username = username;
    if (email) data.email = email;
    if (avatar) data.avatar = avatar;
    if (password) data.password = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data,
        select: { id: true, username: true, email: true, role: true, avatar: true },
      });
      res.json(user);
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2002") {
        res.status(409).json({ error: "Username o email già in uso" });
        return;
      }
      throw e; // Re-throw to global error handler
    }
  })
);

export default router;
