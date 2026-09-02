import informacoes from "../models/informacoes.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = () => process.env.JWT_SECRET;
const publicUser = (user) => ({
    id: user._id,
    nome: user.nome,
    name: user.nome,
    email: user.email,
});
const inputData = (body) => ({
    nome: body.nome || body.name || body.Nome,
    email: body.email || body.Email,
    senha: body.senha || body.password || body.Senha,
    dataNascimento: body.dataNascimento || body.DataNascimento,
    telefone: body.telefone || body.Telefone,
});
const tokenFor = (user) => jwt.sign({ sub: user._id.toString(), email: user.email }, JWT_SECRET(), { expiresIn: "7d" });
const authenticatedUser = async (req) => {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const payload = jwt.verify(token, JWT_SECRET());
    return informacoes.findById(payload.sub);
};

class cadastroController {
    static async criarCadastro(req, res) {
        try {
            const data = inputData(req.body);
            if (!data.nome || !data.email || !data.senha) {
                return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
            }
            if (data.senha.length < 6) return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
            if (!JWT_SECRET()) throw new Error("JWT_SECRET não configurado.");
            const cadastroExistente = await informacoes.findOne({ email: data.email.toLowerCase() });
            if (cadastroExistente) return res.status(409).json({ error: "Já existe uma conta com este e-mail." });

            const novaInformacao = new informacoes({ ...data, senha: await bcrypt.hash(data.senha, 12) });
            await novaInformacao.save();
            res.status(201).json({ message: "Usuário cadastrado com sucesso!", user: publicUser(novaInformacao), token: tokenFor(novaInformacao) });
        } catch (error) {
            res.status(500).json({ error: "Erro ao cadastrar usuário." });
        }
    }

    // Listar todos os cadastros
    static async listarCadastros(req, res) {
        try {
            const cadastros = await informacoes.find();
            res.status(200).json(cadastros);
        } catch (error) {
            res.status(500).send({ message: "Erro ao listar cadastros.", error });
        }
    }

    // Buscar um cadastro por ID
    static async buscarCadastroPorId(req, res) {
        try {
            const cadastro = await informacoes.findById(req.params.id);
            if (cadastro) {
                res.status(200).json(cadastro);
            } else {
                res.status(404).send({ message: "Cadastro não encontrado." });
            }
        } catch (error) {
            res.status(500).send({ message: "Erro ao buscar cadastro.", error });
        }
    }

    // Buscar um cadastro por e-mail
    static async buscarCadastroPorEmail(req, res) {
        try {
            const email = req.params.email;
            const cadastro = await informacoes.findOne({ email: email.toLowerCase() });
            if (cadastro) {
                res.status(200).json(cadastro);
            } else {
                res.status(404).send({ message: "Cadastro não encontrado." });
            }
        } catch (error) {
            res.status(500).send({ message: "Erro ao buscar cadastro.", error });
        }
    }

    // Atualizar um cadastro por ID
    static async atualizarCadastro(req, res) {
        try {
            const cadastroAtualizado = await informacoes.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (cadastroAtualizado) {
                res.status(200).json(cadastroAtualizado);
            } else {
                res.status(404).send({ message: "Cadastro não encontrado." });
            }
        } catch (error) {
            res.status(500).send({ message: "Erro ao atualizar cadastro.", error });
        }
    }

    // Deletar um cadastro por ID
    static async deletarCadastro(req, res) {
        try {
            const cadastroDeletado = await informacoes.findByIdAndDelete(req.params.id);
            if (cadastroDeletado) {
                res.status(200).send({ message: "Cadastro deletado com sucesso!" });
            } else {
                res.status(404).send({ message: "Cadastro não encontrado." });
            }
        } catch (error) {
            res.status(500).send({ message: "Erro ao deletar cadastro.", error });
        }
    }

    static async login(req, res) {
        try {
            if (!JWT_SECRET()) throw new Error("JWT_SECRET não configurado.");
            const { email, senha } = inputData(req.body);
            const usuario = await informacoes.findOne({ email: (email || "").toLowerCase() }).select("+senha");
            if (!usuario || !(await bcrypt.compare(senha || "", usuario.senha))) return res.status(401).json({ error: "E-mail ou senha incorretos." });
            res.status(200).json({ message: "Login realizado com sucesso!", user: publicUser(usuario), token: tokenFor(usuario) });
        } catch (error) {
            res.status(500).json({ error: "Erro ao realizar login." });
        }
    }

    static async me(req, res) {
        try {
            const usuario = await authenticatedUser(req);
            if (!usuario) return res.status(401).json({ error: "Não autenticado." });
            res.status(200).json({ user: publicUser(usuario) });
        } catch {
            res.status(401).json({ error: "Não autenticado." });
        }
    }

    static logout(req, res) {
        res.status(200).json({ success: true });
    }
}

export default cadastroController;