import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import config from "../config/env.js";
import StoredImage from "../models/storedImage.js";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const dataUrlPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const uploadedPattern = /^\/uploads\/([a-f0-9]{32}\.(?:jpg|png|webp))$/;

export function isValidImage(image) {
    return typeof image === "string" && (dataUrlPattern.test(image) || /^https?:\/\/\S+$/i.test(image));
}

// Salva imagens enviadas em base64 no banco e devolve a URL pública (/uploads/<nome>).
// Links http(s) são mantidos como estão.
export async function storeImage(image) {
    const match = image.match(dataUrlPattern);
    if (!match) return image;
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_IMAGE_BYTES) throw Object.assign(new Error("image-too-large"), { status: 400, publicMessage: "Cada imagem pode ter no máximo 6 MB." });
    const name = `${crypto.randomBytes(16).toString("hex")}.${extensions[match[1]]}`;
    await StoredImage.create({ name, contentType: match[1], data: buffer });
    return `/uploads/${name}`;
}

// Apaga fotos enviadas pelos usuários. Links externos e fotos de exemplo são ignorados.
// Também remove do disco as fotos de versões anteriores, que eram salvas em arquivo.
export async function removeStoredImages(images = []) {
    const names = images.map((image) => image.match(uploadedPattern)?.[1]).filter(Boolean);
    if (!names.length) return;
    await StoredImage.deleteMany({ name: { $in: names } });
    await Promise.all(names.map((name) => fs.rm(path.join(config.uploadsDir, name), { force: true }).catch(() => {})));
}
