import express from "express";
import { router as api } from "./controller/api";

export const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API is working!" });
});

app.use("/api", api);

export default app;