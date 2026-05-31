import "module-alias/register";
import dotenv from "dotenv";
dotenv.config();

import type { Request, Response, NextFunction } from "express";
import { PORT } from "@/constants";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupSocket } from "@/lib/socket";
import authRoutes from "@/routes/auth";
import gamesRoutes from "@/routes/games";
import rankingRoutes from "@/routes/ranking";
import profileRoutes from "@/routes/profile";
import adminRoutes from "@/routes/admin";
import matchesRoutes from "@/routes/matches";
import friendsRoutes from "@/routes/friends";
import lobbiesRoutes from "@/routes/lobbies";
import cryptoRoutes from "@/routes/crypto";
import { decryptBody, encryptResponse } from "@/middleware/decrypt";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_req, res) => res.send("Film Rating Guessr API"));

// ── Key exchange (must be before encrypt/decrypt middleware) ──────────────────
app.use("/api/crypto", cryptoRoutes);

// ── Transparent payload encryption for all other /api routes ─────────────────
app.use("/api", encryptResponse, decryptBody);

app.use("/api/auth", authRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/lobbies", lobbiesRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
// Catches any error forwarded via next(err) from asyncHandler-wrapped routes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API error]", err);
  res.status(500).json({ error: "Errore interno del server" });
});

const httpServer = createServer(app);
setupSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`);
});
