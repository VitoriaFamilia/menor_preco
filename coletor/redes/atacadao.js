const { criarColetorVtex } = require('./vtex');

// nomeRede deve ser IGUAL ao nome_rede da tabela mercados.
//
// O Atacadão é atacarejo: o site pode mostrar preço/estoque só para uma loja ou canal de vendas.
// Se a coleta voltar vazia, rode antes:  node coletor/sondar.js atacadao arroz
// e, se for preciso, informe parâmetros extras sem mexer no código:
//   PowerShell:  $env:ATACADAO_CONSULTA="sc=2"; node coletor/coletar.js atacadao
module.exports = criarColetorVtex({
  nomeRede: 'Atacadão',
  baseUrl: 'https://www.atacadao.com.br',
  consultaExtra: process.env.ATACADAO_CONSULTA || '',
});
