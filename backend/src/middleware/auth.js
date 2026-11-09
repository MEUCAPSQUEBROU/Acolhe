import jwt from "jsonwebtoken";
import config from "../config/env.js";
import informacoes from "../models/informacoes.js";

export const tokenFor = (user) => jwt.sign({ sub: user._id.toString(), email: user.email }, config.jwtSecret, { expiresIn: "7d" });

export async function userFromRequest(req) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return null;
    try {
        const payload = jwt.verify(token, config.jwtSecret);
        return await informacoes.findById(payload.sub);
    } catch {
        return null;
    }
}

export function requireAuth(message = "Não autenticado.") {
    return async (req, res, next) => {
        const user = await userFromRequest(req);
        if (!user) return res.status(401).json({ error: message });
        req.user = user;
        next();
    };
}
