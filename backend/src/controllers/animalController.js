import Animal from "../models/animal.js";
import { normalize, escapeRegex, slugify } from "../utils/text.js";
import { isValidImage, storeImage } from "../utils/images.js";
import crypto from "node:crypto";

const text = (value) => (typeof value === "string" ? value.trim() : "");

class animalController {
    static async listar(req, res) {
        const query = {};
        const q = normalize(req.query.q);
        const species = normalize(req.query.species);
        const location = normalize(req.query.location);
        const size = normalize(req.query.size);
        const source = normalize(req.query.source);
        if (q) query.searchText = { $regex: escapeRegex(q) };
        if (species) query.species = species;
        if (location) query.cityKey = { $regex: escapeRegex(location) };
        if (size) query.size = req.query.size;
        if (source && source !== "all") query.sourceType = source;
        if (req.query.urgent === "true") query.urgent = true;
        const direction = req.query.sort === "oldest" ? 1 : -1;
        const animals = await Animal.find(query).sort({ postedAt: direction, createdAt: direction });
        res.json({ animals, total: animals.length });
    }

    static async buscarPorId(req, res) {
        const animal = await Animal.findOne({ id: req.params.id });
        if (!animal) return res.status(404).json({ error: "Animal não encontrado." });
        res.json(animal);
    }

    static async criar(req, res) {
        const input = req.body || {};
        const name = text(input.name);
        const species = text(input.species);
        const city = text(input.city);
        const description = text(input.description);
        const externalLink = text(input.externalLink);
        const whatsapp = text(input.whatsapp).replace(/\D/g, "");

        if (!name || !species || !city || !description) return res.status(400).json({ error: "Preencha nome, espécie, cidade e descrição." });
        const images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
        if (images.length < 1 || images.length > 6) return res.status(400).json({ error: "Adicione entre 1 e 6 imagens do animal." });
        if (!images.every(isValidImage)) return res.status(400).json({ error: "As imagens enviadas não são válidas." });
        if (!externalLink && whatsapp.length < 10) return res.status(400).json({ error: "Informe um WhatsApp válido para o anúncio interno." });
        if (externalLink) {
            try {
                const link = new URL(externalLink);
                if (!["http:", "https:"].includes(link.protocol)) throw new Error("invalid");
            } catch {
                return res.status(400).json({ error: "Informe um link externo válido, começando com http:// ou https://." });
            }
        }

        const animal = new Animal({
            id: `${slugify(name)}-${crypto.randomBytes(4).toString("hex")}`,
            name,
            species,
            city,
            description,
            breed: text(input.breed),
            age: text(input.age),
            size: text(input.size),
            state: text(input.state) || "SE",
            gender: text(input.gender),
            urgent: input.urgent === true || input.urgent === "true" || input.urgent === "on",
            organization: text(input.organization) || "Anunciante independente",
            contact: text(input.contact) || "Contato disponível no anúncio",
            whatsapp: externalLink ? undefined : whatsapp,
            sourceType: externalLink ? "external" : "acolhe",
            externalLink: externalLink || undefined,
            traits: Array.isArray(input.traits) ? input.traits.map(text).filter(Boolean).slice(0, 6) : ["Aguardando um lar"],
            postedAt: new Date().toISOString().slice(0, 10),
            postedBy: req.user._id.toString(),
        });

        // Valida antes de gravar as fotos, para não deixar arquivos órfãos no disco.
        try {
            await animal.validate();
        } catch (error) {
            if (error.name !== "ValidationError") throw error;
            const field = Object.keys(error.errors)[0];
            const labels = { name: "Nome", city: "Cidade", description: "Descrição", organization: "Nome da ONG ou responsável", contact: "Contato adicional", externalLink: "Link externo", state: "Estado", species: "Espécie", whatsapp: "WhatsApp" };
            const kind = error.errors[field]?.kind;
            const message = kind === "maxlength" ? `O campo "${labels[field] || field}" está longo demais.` : `Confira o campo "${labels[field] || field}".`;
            return res.status(400).json({ error: message });
        }

        animal.images = await Promise.all(images.map(storeImage));
        animal.photo = animal.images[0];
        await animal.save();
        res.status(201).json(animal);
    }

    static async estatisticas(req, res) {
        const [animals, organizations, cities] = await Promise.all([
            Animal.countDocuments(),
            Animal.distinct("organization"),
            Animal.distinct("city"),
        ]);
        res.json({ animals, organizations: organizations.length, cities: cities.length });
    }
}

export default animalController;
