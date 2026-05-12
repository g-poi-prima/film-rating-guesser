import { Router } from "express";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import { getRandomMovie } from "@/lib/tmdb";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/random", async (_req: AuthRequest, res) => {
  try {
    const movie = await getRandomMovie();
    res.json({ id: movie.id, title: movie.title, overview: movie.overview, poster: movie.poster });
  } catch {
    res.status(500).json({ error: "Errore nel recupero del film" });
  }
});

router.post("/guess", async (req: AuthRequest, res) => {
  const { movieId, movieTitle, moviePoster, movieOverview, userRating, realRating } = req.body;
  if (userRating == null || realRating == null || !movieId) {
    res.status(400).json({ error: "Dati incompleti" }); return;
  }
  const diff = Math.abs(userRating - realRating);
  const score = diff <= 0.5 ? 100 : diff <= 1 ? 80 : diff <= 2 ? 60 : diff <= 3 ? 40 : diff <= 4 ? 20 : 0;
  const game = await prisma.game.create({
    data: { userId: req.user!.id, movieId, movieTitle, moviePoster, movieOverview, userRating, realRating, score },
  });
  res.json({ game, realRating, score, diff });
});

export default router;