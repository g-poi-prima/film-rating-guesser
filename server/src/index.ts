require("module-alias/register");

import dotenv from "dotenv";
dotenv.config();

import { PORT } from "@/constants";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));

app.get("/", (_, res) => {
  res.send("Hello World!");
});

app.listen(PORT, async () => {
  console.log(`App listening at http://localhost:${PORT}`);
});
