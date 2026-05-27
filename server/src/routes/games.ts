import { Router } from "express";
import prisma from "@/lib/prisma";
import { authenticate } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/asyncHandler";
import { getRandomMovie, getMovieById } from "@/lib/tmdb";
import type { MovieMode } from "@/lib/tmdb";
import { calcScore } from "@/lib/scoring";
import { HISTORY_PAGE_SIZE } from "@/constants";
import type { AuthRequest } from "@/middleware/auth";

const router = Router();
router.use(authenticate);

// ── Random movie ──────────────────────────────────────────────────────────────

router.get(
  "/random",
  asyncHandler(async (req: AuthRequest, res) => {
    const raw = req.query.mode;
    const mode: MovieMode = raw === "any" ? "any" : "popular";
    try {
      const movie = await getRandomMovie(mode);
      res.json({ id: movie.id, title: movie.title, overview: movie.overview, poster: movie.poster });
    } catch {
      res.status(500).json({ error: "Errore nel recupero del film" });
    }
  })
);

// ── Submit guess ──────────────────────────────────────────────────────────────

router.post(
  "/guess",
  asyncHandler(async (req: AuthRequest, res) => {
    const { movieId, movieTitle, moviePoster, movieOverview, userRating } = req.body as {
      movieId?: number;
      movieTitle?: string;
      moviePoster?: string | null;
      movieOverview?: string | null;
      userRating?: number;
    };

    if (userRating == null || !movieId) {
      res.status(400).json({ error: "Dati incompleti" });
      return;
    }

    const movieData = await getMovieById(movieId);
    if (!movieData) {
      res.status(404).json({ error: "Film non trovato" });
      return;
    }

    const diff = Math.abs(userRating - movieData.rating);
    const score = calcScore(diff);

    const game = await prisma.game.create({
      data: {
        userId: req.user!.id,
        movieId,
        movieTitle: movieTitle ?? movieData.title,
        moviePoster: moviePoster ?? movieData.poster,
        movieOverview: movieOverview ?? movieData.overview,
        userRating,
        realRating: movieData.rating,
        score,
      },
    });

    res.json({ game, realRating: movieData.rating, score, diff });
  })
);

// ── History (paginated) ───────────────────────────────────────────────────────

router.get(
  "/history",
  asyncHandler(async (req: AuthRequest, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const skip = (page - 1) * HISTORY_PAGE_SIZE;

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: HISTORY_PAGE_SIZE,
      }),
      prisma.game.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({ games, total, page, totalPages: Math.ceil(total / HISTORY_PAGE_SIZE) });
  })
);

export default router;
