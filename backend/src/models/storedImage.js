import mongoose from "mongoose";

// Fotos enviadas pelos usuários ficam no banco, e não no disco do servidor:
// em hospedagens como o plano grátis do Render, o disco é apagado a cada reinício.
const storedImageSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
}, { timestamps: true, versionKey: false });

const StoredImage = mongoose.models.StoredImage || mongoose.model("StoredImage", storedImageSchema);

export default StoredImage;
