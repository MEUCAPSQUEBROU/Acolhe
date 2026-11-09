// Limitador simples em memória, por IP. Suficiente para uma única instância.
export function rateLimit({ windowMs, max }) {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
    }, windowMs).unref();

    return (req, res, next) => {
        const now = Date.now();
        const entry = hits.get(req.ip);
        if (!entry || entry.reset <= now) {
            hits.set(req.ip, { count: 1, reset: now + windowMs });
            return next();
        }
        entry.count += 1;
        if (entry.count > max) {
            res.set("Retry-After", Math.ceil((entry.reset - now) / 1000));
            return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
        }
        next();
    };
}
