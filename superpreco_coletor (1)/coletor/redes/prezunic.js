const { criarColetorVtex } = require('./vtex');

// nomeRede deve ser IGUAL ao nome_rede da tabela mercados.
module.exports = criarColetorVtex({
  nomeRede: 'Prezunic',
  baseUrl: 'https://www.prezunic.com.br',
});
