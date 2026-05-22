import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { lobbies, lobbyToPublic } from "@/lib/lobbyStore";

const router = Router();
router.use(authenticate);

// GET /api/lobbies – list open (WAITING) lobbies
router.get("/", (_req, res) => {
  const open = Array.from(lobbies.values())
    .filter((l) => l.status === "WAITING")
    .map(lobbyToPublic);
  res.json(open);
});

export default router;
