import express from "express";
import informacoesRoutes from "./informacoesRoutes.js";

const routes = (app) => {
    app.route("/").get((req, res) => {
        res.status(200).json({ status: "ok", message: "API em execução" });
    });
    app.use("/", informacoesRoutes);
};

export default routes;