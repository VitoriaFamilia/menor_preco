const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/usuarioModel');

exports.cadastrar = async (req, res) => {
  try {
    const { nome, email, senha, cep } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos' });
    if (await UsuarioModel.buscarPorEmail(email)) return res.status(409).json({ erro: 'E-mail já cadastrado' });
    const hash = await bcrypt.hash(senha, 10);
    const id = await UsuarioModel.criar(nome, email, hash, cep);
    res.status(201).json({ id_usuario: id, nome, email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const usuario = await UsuarioModel.buscarPorEmail(email);
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash)))
      return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
    res.json({ id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

exports.esqueciSenha = async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await UsuarioModel.buscarPorEmail(email);
    if (!usuario) return res.status(404).json({ erro: 'E-mail não encontrado' });
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    await UsuarioModel.criarCodigo(usuario.id_usuario, codigo);
    console.log(`[SIMULAÇÃO E-MAIL] Código para ${email}: ${codigo}`);
    // Demonstração local: devolvemos o código em vez de enviar e-mail
    res.json({ mensagem: 'Código enviado (simulado)', codigo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

exports.verificarCodigo = async (req, res) => {
  try {
    const { email, codigo } = req.body;
    const usuario = await UsuarioModel.buscarPorEmail(email);
    const valido = usuario && await UsuarioModel.buscarCodigoValido(usuario.id_usuario, codigo);
    if (valido) return res.json({ valido: true });
    res.status(400).json({ valido: false, erro: 'Código incorreto ou expirado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

exports.novaSenha = async (req, res) => {
  try {
    const { email, codigo, novaSenha } = req.body;
    const usuario = await UsuarioModel.buscarPorEmail(email);
    const registro = usuario && await UsuarioModel.buscarCodigoValido(usuario.id_usuario, codigo);
    if (!registro) return res.status(400).json({ erro: 'Código inválido ou expirado' });
    await UsuarioModel.atualizarSenha(usuario.id_usuario, await bcrypt.hash(novaSenha, 10));
    await UsuarioModel.marcarCodigoUsado(registro.id_recuperacao);
    res.json({ mensagem: 'Senha atualizada' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};