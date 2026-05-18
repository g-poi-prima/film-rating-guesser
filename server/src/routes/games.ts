import { Router } from "express";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import { getRandomMovie, getMovieById } from "@/lib/tmdb";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();

router.use(authenticate);

router.get("/random", async (_req: AuthRequest, res) => {
  try {
    const movie = await getRandomMovie();
    res.json({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster: movie.poster,
    });
  } catch {
    res.status(500).json({ error: "Errore nel recupero del film" });
  }
});

router.post("/guess", async (req: AuthRequest, res) => {
  const { movieId, movieTitle, moviePoster, movieOverview, userRating } = req.body;

  if (userRating == null || !movieId) {
    res.status(400).json({ error: "Dati incompleti" });
    return;
  }

  const movieData = await getMovieById(movieId);
  if (!movieData) {
    res.status(404).json({ error: "Film non trovato" });
    return;
  }

  const realRating = movieData.rating;
  const diff = Math.abs(userRating - realRating);

  let score: number;
  if (diff <= 0.5) score = 100;
  else if (diff <= 1) score = 80;
  else if (diff <= 2) score = 60;
  else if (diff <= 3) score = 40;
  else if (diff <= 4) score = 20;
  else score = 0;

  const game = await prisma.game.create({
    data: {
      userId: req.user!.id,
      movieId,
      movieTitle,
      moviePoster,
      movieOverview,
      userRating,
      realRating,
      score,
    },
  });

  res.json({ game, realRating, score, diff });
});

router.get("/history", async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.game.count({ where: { userId: req.user!.id } }),
  ]);

  res.json({
    games,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
