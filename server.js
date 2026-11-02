const express = require('express');
const cors = require('cors');
require('dotenv').config();

const usuarioRoutes = require('./src/routes/usuarioRoutes');

const app = express();

// 1. Liberação do CORS para o Front-end consumir as rotas
app.use(cors());

// 2. Middleware para aceitar requisições em formato JSON
app.use(express.json());

// 3. Registar as rotas de utilizadores com o prefixo /api/usuarios
app.use('/api/usuarios', usuarioRoutes);
app.use('/api', require('./src/routes/comparadorRoutes'));

// Rota raiz de teste
app.get('/', (req, res) => {
    res.json({ mensagem: "API do Super Preço a funcionar com sucesso!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});