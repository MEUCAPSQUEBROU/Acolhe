import mongoose from "mongoose";

const informacoesSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senha: { type: String, required: true, select: false },
    dataNascimento: { type: Date },
    telefone: { type: String, trim: true },
}, { timestamps: true, versionKey: false });

const informacoes = mongoose.models.informacoes || mongoose.model("informacoes", informacoesSchema);

export default informacoes;