import Animal from "../models/animal.js";
import informacoes from "../models/informacoes.js";

class favoritoController {
    static listar(req, res) {
        res.json({ favorites: req.user.favoritos });
    }

    static async adicionar(req, res) {
        if (!(await Animal.exists({ id: req.params.id }))) return res.status(404).json({ error: "Animal não encontrado." });
        const user = await informacoes.findByIdAndUpdate(req.user._id, { $addToSet: { favoritos: req.params.id } }, { returnDocument: "after" });
        res.json({ favorites: user.favoritos });
    }

    static async remover(req, res) {
        const user = await informacoes.findByIdAndUpdate(req.user._id, { $pull: { favoritos: req.params.id } }, { returnDocument: "after" });
        res.json({ favorites: user.favoritos });
    }
}

export default favoritoController;
