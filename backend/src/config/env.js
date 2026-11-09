import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const config = {
    port: Number(process.env.PORT) || 3000,
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    seedDemoData: process.env.SEED_DEMO_DATA !== "false",
    rootDir,
    publicDir: path.join(rootDir, "frontend"),
    dataDir: path.join(rootDir, "backend", "data"),
    uploadsDir: path.resolve(rootDir, process.env.UPLOADS_DIR || "uploads"),
};

export function validateConfig() {
    const problems = [];
    if (!config.mongodbUri) problems.push("MONGODB_URI não definido.");
    if (!config.jwtSecret || config.jwtSecret.length < 32) problems.push("JWT_SECRET precisa ter pelo menos 32 caracteres.");
    if (problems.length) throw new Error(problems.join(" "));
}

export default config;
