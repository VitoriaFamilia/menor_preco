const express = require('express');
const c = require('../controllers/usuarioController');

const router = express.Router();

router.post('/cadastro', c.cadastrar);
router.post('/login', c.login);
router.post('/esqueci-senha', c.esqueciSenha);
router.post('/verificar-codigo', c.verificarCodigo);
router.post('/nova-senha', c.novaSenha);

module.exports = router;