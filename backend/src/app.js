import express from "express";
import config from "./config/env.js";
import routes from "./routes/index.js";

const app = express();

// Atrás de proxy (Caddy/Nginx) o IP real vem no X-Forwarded-For.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((req, res, next) => {
    res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    next();
});

// A publicação de anúncios tem limite maior (fotos); ela usa seu próprio parser.
const smallJson = express.json({ limit: "1mb" });
app.use((req, res, next) => (req.method === "POST" && req.path === "/api/animals" ? next() : smallJson(req, res, next)));

routes(app);

app.use("/api", (req, res) => res.status(404).json({ error: "Rota não encontrada." }));
app.use("/uploads", express.static(config.uploadsDir, { maxAge: "30d", immutable: true, fallthrough: false }));
app.use(express.static(config.publicDir, { maxAge: "1h" }));

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    const status = error.status || error.statusCode || 500;
    if (status === 413) return res.status(413).json({ error: "As imagens são grandes demais. Tente fotos menores." });
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Envie os dados em formato válido." });
    if (status >= 500) console.error(error);
    res.status(status).json({ error: error.publicMessage || (status === 404 ? "Arquivo não encontrado." : "Erro interno do servidor.") });
});

export default app;
