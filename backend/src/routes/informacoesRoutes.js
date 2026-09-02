import express from "express";
import cadastroController from "../controllers/cadastroController.js";

const routes = express.Router();

routes.get("/dados", cadastroController.listarCadastros);
routes.get("/dados/:id", cadastroController.buscarCadastroPorId);
routes.post("/dados", cadastroController.criarCadastro);
routes.put("/dados/:id", cadastroController.atualizarCadastro);
routes.delete("/dados/:id", cadastroController.deletarCadastro);
routes.post("/login", cadastroController.login);
routes.get("/dados/email/:email", cadastroController.buscarCadastroPorEmail);
routes.post("/api/auth/register", cadastroController.criarCadastro);
routes.post("/api/auth/login", cadastroController.login);
routes.get("/api/auth/me", cadastroController.me);
routes.post("/api/auth/logout", cadastroController.logout);

export default routes;