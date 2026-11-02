const db = require('../config/db');

const UsuarioModel = {
  async buscarPorEmail(email) {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0];
  },
  async criar(nome, email, senhaHash, cep) {
    const [result] = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, cep) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, cep || null]
    );
    return result.insertId;
  },
  async atualizarSenha(idUsuario, senhaHash) {
    await db.query('UPDATE usuarios SET senha_hash = ? WHERE id_usuario = ?', [senhaHash, idUsuario]);
  },
  // Código de recuperação (tabela recuperacao_senha), válido por 15 minutos
  async criarCodigo(idUsuario, codigo) {
    await db.query('UPDATE recuperacao_senha SET utilizado = 1 WHERE id_usuario = ? AND utilizado = 0', [idUsuario]);
    await db.query(
      'INSERT INTO recuperacao_senha (id_usuario, token, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [idUsuario, codigo]
    );
  },
  async buscarCodigoValido(idUsuario, codigo) {
    const [rows] = await db.query(
      'SELECT * FROM recuperacao_senha WHERE id_usuario = ? AND token = ? AND utilizado = 0 AND expira_em > NOW()',
      [idUsuario, codigo]
    );
    return rows[0];
  },
  async marcarCodigoUsado(idRecuperacao) {
    await db.query('UPDATE recuperacao_senha SET utilizado = 1 WHERE id_recuperacao = ?', [idRecuperacao]);
  }
};

module.exports = UsuarioModel;