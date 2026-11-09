import mongoose from "mongoose";
import informacoesRoutes from "./informacoesRoutes.js";
import animalRoutes from "./animalRoutes.js";

const routes = (app) => {
    app.get("/api/health", (req, res) => {
        const dbOk = mongoose.connection.readyState === 1;
        res.status(dbOk ? 200 : 503).json({ status: dbOk ? "ok" : "degraded", database: dbOk });
    });
    app.use(informacoesRoutes);
    app.use(animalRoutes);
};

export default routes;
