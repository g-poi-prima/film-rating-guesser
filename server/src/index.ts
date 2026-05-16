import "module-alias/register";
import dotenv from "dotenv";
dotenv.config();

import { PORT } from "@/constants";
import express from "express";
import cors from "cors";
import authRoutes from "@/routes/auth";
import gamesRoutes from "@/routes/games";
import rankingRoutes from "@/routes/ranking";
import profileRoutes from "@/routes/profile";
import adminRoutes from "@/routes/admin";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_, res) => {
  res.send("Film Rating Guessr API");
});

app.use("/api/auth", authRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, async () => {
  console.log(`App listening at http://localhost:${PORT}`);
});
