import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import config from "./config/env.js";
import Animal from "./models/animal.js";
import informacoes from "./models/informacoes.js";

const readJson = async (file) => JSON.parse(await fs.readFile(path.join(config.dataDir, file), "utf8"));

// Popula o banco com os anúncios e a conta de demonstração, apenas se ainda não existirem.
export default async function seedDemoData() {
    if ((await Animal.estimatedDocumentCount()) === 0) {
        const seed = [...(await readJson("external-animals.json")), ...(await readJson("internal-animals.json"))];
        for (const item of seed) {
            const images = item.images?.length ? item.images : [item.photo];
            await Animal.create({ ...item, images, photo: images[0] });
        }
        console.log(`${seed.length} anúncios de exemplo cadastrados.`);
    }

    if (!(await informacoes.exists({ email: "demo@acolhe.local" }))) {
        await informacoes.create({ nome: "Usuário demonstração", email: "demo@acolhe.local", senha: await bcrypt.hash("acolhe123", 12) });
        console.log("Conta de demonstração criada: demo@acolhe.local / acolhe123");
    }
}
