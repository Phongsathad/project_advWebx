import express from "express";
import { router as api } from "./controller/api";
import dotenv from 'dotenv';
import cors from "cors";

dotenv.config();

export const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use("/api", api);

export default app;