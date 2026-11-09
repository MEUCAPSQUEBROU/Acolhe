import express from "express";
import cadastroController from "../controllers/cadastroController.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const routes = express.Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

routes.post("/api/auth/register", authLimit, cadastroController.criarCadastro);
routes.post("/api/auth/login", authLimit, cadastroController.login);
routes.get("/api/auth/me", requireAuth(), cadastroController.me);
routes.post("/api/auth/logout", cadastroController.logout);

export default routes;
