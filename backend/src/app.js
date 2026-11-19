import express from "express";
import config from "./config/env.js";
import routes from "./routes/index.js";
import StoredImage from "./models/storedImage.js";

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

// Publicar e editar anúncios têm limite maior (fotos); essas rotas usam seu próprio parser.
const smallJson = express.json({ limit: "1mb" });
const sendsPhotos = (req) => (req.method === "POST" && req.path === "/api/animals") || (req.method === "PUT" && req.path.startsWith("/api/animals/"));
app.use((req, res, next) => (sendsPhotos(req) ? next() : smallJson(req, res, next)));

routes(app);

app.use("/api", (req, res) => res.status(404).json({ error: "Rota não encontrada." }));
// Fotos enviadas ficam no banco; se não estiverem lá, tenta a pasta de uploads (versões antigas).
app.get("/uploads/:name", async (req, res, next) => {
    const image = await StoredImage.findOne({ name: req.params.name });
    if (!image) return next();
    res.set({ "Content-Type": image.contentType, "Cache-Control": "public, max-age=2592000, immutable" });
    res.send(image.data);
});
app.use("/uploads", express.static(config.uploadsDir, { maxAge: "30d", immutable: true, fallthrough: false }));
// HTML, JS e CSS são revalidados a cada acesso (ETag), para uma atualização do site
// nunca misturar arquivos novos com antigos guardados no navegador. Fotos seguem em cache.
app.use(express.static(config.publicDir, {
    maxAge: "1h",
    setHeaders: (res, filePath) => {
        if (/\.(?:html|js|css)$/.test(filePath)) res.setHeader("Cache-Control", "no-cache");
    },
}));

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
    const status = error.status || error.statusCode || 500;
    if (status === 413) return res.status(413).json({ error: "As imagens são grandes demais. Tente fotos menores." });
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Envie os dados em formato válido." });
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ error: "Confira os dados informados e tente novamente." });
    if (status >= 500) console.error(error);
    res.status(status).json({ error: error.publicMessage || (status === 404 ? "Arquivo não encontrado." : "Erro interno do servidor.") });
});

export default app;
