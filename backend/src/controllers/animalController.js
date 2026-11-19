import Animal from "../models/animal.js";
import informacoes from "../models/informacoes.js";
import { normalize, escapeRegex, slugify } from "../utils/text.js";
import { isValidImage, storeImage, removeStoredImages } from "../utils/images.js";
import crypto from "node:crypto";

const text = (value) => (typeof value === "string" ? value.trim() : "");
const SIZES = ["pequeno", "médio", "grande"];
const DEFAULT_ORGANIZATION = "Anunciante independente";
const DEFAULT_CONTACT = "Contato disponível no anúncio";
const FIELD_LABELS = { name: "Nome", city: "Cidade", description: "Descrição", organization: "Nome da ONG ou responsável", contact: "Contato adicional", externalLink: "Link externo", state: "Estado", species: "Espécie", whatsapp: "WhatsApp" };

// Lê e valida os campos enviados pelo formulário de anúncio.
// `currentImages` são as fotos já salvas do anúncio (na edição), que podem ser mantidas.
function parseAnimalInput(input = {}, currentImages = []) {
    const name = text(input.name);
    const species = text(input.species);
    const city = text(input.city);
    const description = text(input.description);
    const externalLink = text(input.externalLink);
    const whatsapp = text(input.whatsapp).replace(/\D/g, "");

    if (!name || !species || !city || !description) return { error: "Preencha nome, espécie, cidade e descrição." };
    const images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
    if (images.length < 1 || images.length > 6) return { error: "Adicione entre 1 e 6 imagens do animal." };
    if (!images.every((image) => currentImages.includes(image) || isValidImage(image))) return { error: "As imagens enviadas não são válidas." };
    if (!externalLink && whatsapp.length < 10) return { error: "Informe um WhatsApp válido para o anúncio interno." };
    if (externalLink) {
        try {
            const link = new URL(externalLink);
            if (!["http:", "https:"].includes(link.protocol)) throw new Error("invalid");
        } catch {
            return { error: "Informe um link externo válido, começando com http:// ou https://." };
        }
    }

    return {
        images,
        fields: {
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
            organization: text(input.organization) || DEFAULT_ORGANIZATION,
            contact: text(input.contact) || DEFAULT_CONTACT,
            whatsapp: externalLink ? undefined : whatsapp,
            sourceType: externalLink ? "external" : "acolhe",
            externalLink: externalLink || undefined,
        },
    };
}

// Valida antes de gravar as fotos, para não deixar arquivos órfãos no disco.
async function validationMessage(animal) {
    try {
        await animal.validate();
        return null;
    } catch (error) {
        if (error.name !== "ValidationError") throw error;
        const field = Object.keys(error.errors)[0];
        const label = FIELD_LABELS[field] || field;
        return error.errors[field]?.kind === "maxlength" ? `O campo "${label}" está longo demais.` : `Confira o campo "${label}".`;
    }
}

class animalController {
    static async listar(req, res) {
        const query = {};
        const q = normalize(req.query.q);
        const species = normalize(req.query.species);
        const location = normalize(req.query.location);
        const sizes = String(req.query.size || "").split(",").map((size) => size.trim()).filter((size) => SIZES.includes(size));
        const source = normalize(req.query.source);
        if (q) query.searchText = { $regex: escapeRegex(q) };
        if (species) query.species = species;
        if (location) query.cityKey = { $regex: escapeRegex(location) };
        if (sizes.length) query.size = { $in: sizes };
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

    static async meus(req, res) {
        const animals = await Animal.find({ postedBy: req.user._id.toString() }).sort({ createdAt: -1 });
        res.json({ animals, total: animals.length });
    }

    static async criar(req, res) {
        const parsed = parseAnimalInput(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        const animal = new Animal({
            ...parsed.fields,
            id: `${slugify(parsed.fields.name)}-${crypto.randomBytes(4).toString("hex")}`,
            traits: Array.isArray(req.body.traits) ? req.body.traits.map(text).filter(Boolean).slice(0, 6) : ["Aguardando um lar"],
            postedAt: new Date().toISOString().slice(0, 10),
            postedBy: req.user._id.toString(),
        });
        const invalid = await validationMessage(animal);
        if (invalid) return res.status(400).json({ error: invalid });

        animal.images = await Promise.all(parsed.images.map(storeImage));
        animal.photo = animal.images[0];
        await animal.save();
        res.status(201).json(animal);
    }

    static async atualizar(req, res) {
        const animal = await Animal.findOne({ id: req.params.id, postedBy: req.user._id.toString() });
        if (!animal) return res.status(404).json({ error: "Anúncio não encontrado entre os seus anúncios." });

        const previousImages = [...animal.images];
        const parsed = parseAnimalInput(req.body, previousImages);
        if (parsed.error) return res.status(400).json({ error: parsed.error });

        animal.set(parsed.fields);
        const invalid = await validationMessage(animal);
        if (invalid) return res.status(400).json({ error: invalid });

        animal.images = await Promise.all(parsed.images.map((image) => (previousImages.includes(image) ? image : storeImage(image))));
        animal.photo = animal.images[0];
        await animal.save();
        await removeStoredImages(previousImages.filter((image) => !animal.images.includes(image)));
        res.json(animal);
    }

    static async excluir(req, res) {
        const animal = await Animal.findOneAndDelete({ id: req.params.id, postedBy: req.user._id.toString() });
        if (!animal) return res.status(404).json({ error: "Anúncio não encontrado entre os seus anúncios." });
        await informacoes.updateMany({ favoritos: animal.id }, { $pull: { favoritos: animal.id } });
        await removeStoredImages(animal.images);
        res.json({ success: true });
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
