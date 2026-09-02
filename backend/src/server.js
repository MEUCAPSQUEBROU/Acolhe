import "dotenv/config";
import app from "./app.js";
import conectaNaDatabase from "./config/dbconnection.js";

const PORT = process.env.PORT || 3000;

conectaNaDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`API rodando na porta ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Não foi possível iniciar a API:", error.message);
        process.exitCode = 1;
    });