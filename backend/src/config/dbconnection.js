import mongoose from "mongoose";
import config from "./env.js";

async function conectaNaDatabase() {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 15000 });
    console.log("Conexão com o MongoDB realizada com sucesso!");
    return mongoose.connection;
}

export default conectaNaDatabase;
