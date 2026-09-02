import mongoose from "mongoose";

async function conectaNaDatabase() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("Defina MONGODB_URI com a string de conexão do MongoDB Atlas.");
    }

    await mongoose.connect(uri);
    console.log("Conexão com o MongoDB realizada com sucesso!");
    return mongoose.connection;
}

export default conectaNaDatabase;