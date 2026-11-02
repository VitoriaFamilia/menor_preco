const express = require('express');
const c = require('../controllers/comparadorController');

const router = express.Router();

router.get('/produtos', c.listarProdutos);
router.post('/localizacao/cep', c.consultarCep);
router.post('/comparar', c.comparar);

module.exports = router;
