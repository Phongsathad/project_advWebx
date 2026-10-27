import express from "express";
import { router as api } from "./controller/api";
import dotenv from 'dotenv';
dotenv.config();

export const app = express();
app.use(express.json());
app.use("/api", api);
// ปิดโค้ดเก่าทิ้งไป:
// app.use("/", (req, res) => {
//   res.send("Hello World!!!");
// });
export default app;