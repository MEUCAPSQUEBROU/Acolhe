import mongoose from "mongoose";
import config, { validateConfig } from "./config/env.js";
import app from "./app.js";
import conectaNaDatabase from "./config/dbconnection.js";
import seedDemoData from "./seed.js";

async function start() {
    validateConfig();
    await conectaNaDatabase();
    if (config.seedDemoData) await seedDemoData();

    const server = app.listen(config.port, () => {
        console.log(`Acolhe rodando em http://localhost:${config.port}`);
    });

    const shutdown = (signal) => {
        console.log(`${signal} recebido, encerrando...`);
        server.close(async () => {
            await mongoose.disconnect();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

start().catch((error) => {
    console.error("Não foi possível iniciar o Acolhe:", error.message);
    process.exit(1);
});
