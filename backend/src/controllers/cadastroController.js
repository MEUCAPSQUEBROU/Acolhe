import informacoes from "../models/informacoes.js";
import bcrypt from "bcryptjs";
import { tokenFor } from "../middleware/auth.js";

const publicUser = (user) => ({
    id: user._id,
    nome: user.nome,
    name: user.nome,
    email: user.email,
});
const inputData = (body = {}) => ({
    nome: String(body.nome || body.name || body.Nome || "").trim(),
    email: String(body.email || body.Email || "").trim().toLowerCase(),
    senha: String(body.senha || body.password || body.Senha || ""),
    dataNascimento: body.dataNascimento || body.DataNascimento,
    telefone: body.telefone || body.Telefone,
});

class cadastroController {
    static async criarCadastro(req, res) {
        try {
            const data = inputData(req.body);
            if (!data.nome || !data.email || !data.senha) {
                return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return res.status(400).json({ error: "Informe um e-mail válido." });
            if (data.senha.length < 6) return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
            const cadastroExistente = await informacoes.findOne({ email: data.email });
            if (cadastroExistente) return res.status(409).json({ error: "Já existe uma conta com este e-mail." });

            const novaInformacao = new informacoes({ ...data, senha: await bcrypt.hash(data.senha, 12) });
            await novaInformacao.save();
            res.status(201).json({ message: "Usuário cadastrado com sucesso!", user: publicUser(novaInformacao), token: tokenFor(novaInformacao) });
        } catch (error) {
            console.error("Erro ao cadastrar usuário:", error.message);
            res.status(500).json({ error: "Erro ao cadastrar usuário." });
        }
    }

    static async login(req, res) {
        try {
            const { email, senha } = inputData(req.body);
            const usuario = await informacoes.findOne({ email }).select("+senha");
            if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) return res.status(401).json({ error: "E-mail ou senha incorretos." });
            res.status(200).json({ message: "Login realizado com sucesso!", user: publicUser(usuario), token: tokenFor(usuario) });
        } catch (error) {
            console.error("Erro ao realizar login:", error.message);
            res.status(500).json({ error: "Erro ao realizar login." });
        }
    }

    static me(req, res) {
        res.status(200).json({ user: publicUser(req.user) });
    }

    // O token JWT é descartado pelo navegador; não há sessão no servidor.
    static logout(req, res) {
        res.status(200).json({ success: true });
    }
}

export default cadastroController;
