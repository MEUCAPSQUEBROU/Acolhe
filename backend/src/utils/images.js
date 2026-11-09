import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import config from "../config/env.js";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const dataUrlPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export function isValidImage(image) {
    return typeof image === "string" && (dataUrlPattern.test(image) || /^https?:\/\/\S+$/i.test(image));
}

// Salva imagens enviadas em base64 no disco e devolve a URL pública.
// Links http(s) são mantidos como estão.
export async function storeImage(image) {
    const match = image.match(dataUrlPattern);
    if (!match) return image;
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_IMAGE_BYTES) throw Object.assign(new Error("image-too-large"), { status: 400, publicMessage: "Cada imagem pode ter no máximo 6 MB." });
    const fileName = `${crypto.randomBytes(16).toString("hex")}.${extensions[match[1]]}`;
    await fs.mkdir(config.uploadsDir, { recursive: true });
    await fs.writeFile(path.join(config.uploadsDir, fileName), buffer);
    return `/uploads/${fileName}`;
}
