import express from "express";
import cors from "cors";
import "dotenv/config";
import routes from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
routes(app);

export default app;