require("module-alias/register");

import dotenv from "dotenv";
dotenv.config();

import { PORT } from "@/constants";
import express from "express";
import cors from "cors";
import authRoutes from "@/routes/auth";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_, res) => { res.send("Film Rating Guessr API"); });
app.use("/api/auth", authRoutes);

app.listen(PORT, async () => {
  console.log(`App listening at http://localhost:${PORT}`);
});