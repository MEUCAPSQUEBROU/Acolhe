import express from "express";
import animalController from "../controllers/animalController.js";
import favoritoController from "../controllers/favoritoController.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const routes = express.Router();
const largeJson = express.json({ limit: "45mb" });
const publishLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });

routes.get("/api/animals", animalController.listar);
routes.get("/api/animals/:id", animalController.buscarPorId);
routes.post("/api/animals", requireAuth("Faça login para publicar um anúncio."), publishLimit, largeJson, animalController.criar);
routes.get("/api/stats", animalController.estatisticas);

const favoritesAuth = requireAuth("Faça login para salvar favoritos.");
routes.get("/api/favorites", favoritesAuth, favoritoController.listar);
routes.post("/api/favorites/:id", favoritesAuth, favoritoController.adicionar);
routes.delete("/api/favorites/:id", favoritesAuth, favoritoController.remover);

export default routes;
