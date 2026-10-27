import express from "express";
import { router as api } from "./controller/api";

export const app = express();

app.use(express.json());

// เพิ่มทดสอบ status
app.get("/", (req, res) => {
  res.json({ message: "Server is running on Vercel!" });
});

app.use("/api", api);

export default app;