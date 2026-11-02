// Coleta o MENOR preço de cada um dos 18 itens (qualquer marca, no tamanho de referência)
// e grava um CSV em /dados.
//
//   node coletor/coletar.js                 -> todas as redes
//   node coletor/coletar.js prezunic        -> só uma rede
//   node coletor/coletar.js prezunic --detalhe   -> mostra também os 3 mais baratos de cada item
//
// Para os itens SEM preço, o coletor explica o motivo (tamanho diferente, palavra proibida...)
// e grava o diagnóstico em dados/AAAA-MM-DD_rede_diagnostico.txt.

const fs = require('node:fs');
const path = require('node:path');
const { filtrar, motivoDescarte } = require('./normalizar');
const itens = require('./itens');

const REDES = {
  prezunic: require('./redes/prezunic'),
  atacadao: require('./redes/atacadao'),
  // (próximas redes entram aqui)
};

const args = process.argv.slice(2);
const detalhe = args.includes('--detalhe');
const escolhidas = args.filter((a) => !a.startsWith('--'));
const chaves = escolhidas.length ? escolhidas : Object.keys(REDES);

const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
const limpar = (s) => String(s ?? '').replace(/[;\r\n"]/g, ' ').replace(/\s+/g, ' ').trim();
const reais = (v) => v.toFixed(2).replace('.', ',');

// Para um item sem preço: o que o site devolveu e por que cada produto foi descartado.
// Primeiro os "sem estoque" (item certo, mas esgotado) e os de "tamanho diferente" (item certo, outro tamanho).
function explicarFalta(candidatos, item) {
  const prioridade = (m) => (m.startsWith('sem estoque') ? 0 : m.startsWith('tamanho') ? 1 : m.startsWith('palavra') ? 2 : 3);
  return candidatos
    .map((c) => ({ c, motivo: motivoDescarte(c, item) }))
    .filter((x) => x.motivo)
    .sort((a, b) => prioridade(a.motivo) - prioridade(b.motivo) || a.c.preco - b.c.preco)
    .slice(0, 8)
    .map((x) => `     · [${x.motivo}] ${x.c.nome} (R$ ${reais(x.c.preco)})`);
}

async function coletarRede(chave) {
  const rede = REDES[chave];
  if (!rede) throw new Error(`Rede desconhecida: ${chave}. Disponíveis: ${Object.keys(REDES).join(', ')}`);

  console.log(`\n=== ${rede.nomeRede} — ${hoje} ===`);
  const linhas = ['data;rede;item;tamanho_ref;preco;produto_encontrado;marca;link;candidatos_validos'];
  const diagnostico = [`Diagnóstico ${rede.nomeRede} — ${hoje}`, ''];
  const faltando = [];
  let achados = 0;
  let totalCandidatos = 0;

  for (const item of itens) {
    try {
      const candidatos = await rede.candidatosDoItem(item);
      totalCandidatos += candidatos.length;
      const validos = filtrar(candidatos, item);
      const melhor = validos[0];
      if (melhor) {
        achados++;
        console.log(`✔ ${item.nome} (${item.tamanho}): R$ ${reais(melhor.preco)} — ${melhor.nome}  [${validos.length} opções]`);
        if (detalhe) validos.slice(0, 3).forEach((v) => console.log(`     · R$ ${reais(v.preco)}  ${v.nome}`));
      } else {
        faltando.push(item.nome);
        const cab = `✘ ${item.nome} (${item.tamanho}): SEM PREÇO — o site devolveu ${candidatos.length} produtos, nenhum serve`;
        const motivos = explicarFalta(candidatos, item);
        console.log(cab);
        motivos.forEach((m) => console.log(m));
        diagnostico.push(cab, ...motivos, '');
      }
      linhas.push([
        hoje, rede.nomeRede, limpar(item.nome), item.tamanho,
        melhor ? melhor.preco.toFixed(2) : '',
        limpar(melhor?.nome), limpar(melhor?.marca), limpar(melhor?.link), validos.length,
      ].join(';'));
    } catch (e) {
      faltando.push(item.nome);
      console.log(`✘ ${item.nome}: ERRO — ${e.message}`);
      diagnostico.push(`✘ ${item.nome}: ERRO — ${e.message}`, '');
      linhas.push([hoje, rede.nomeRede, limpar(item.nome), item.tamanho, '', '', '', '', 0].join(';'));
    }
  }

  const pasta = path.join(__dirname, '..', 'dados');
  fs.mkdirSync(pasta, { recursive: true });
  const arquivo = path.join(pasta, `${hoje}_${chave}.csv`);
  fs.writeFileSync(arquivo, '﻿' + linhas.join('\n') + '\n', 'utf8');
  if (faltando.length) {
    fs.writeFileSync(path.join(pasta, `${hoje}_${chave}_diagnostico.txt`), diagnostico.join('\n'), 'utf8');
  }

  console.log(`\n${achados}/${itens.length} itens com preço. Arquivo: ${arquivo}`);
  if (faltando.length) {
    console.log(`SEM PREÇO (${faltando.length}): ${faltando.join(', ')}`);
    console.log(`Diagnóstico: dados/${hoje}_${chave}_diagnostico.txt`);
  }
  if (totalCandidatos === 0) {
    console.log(`\n⚠ O site de ${rede.nomeRede} não devolveu NENHUM produto com preço. Veja o que ele responde com:`);
    console.log(`   node coletor/sondar.js ${chave}`);
  }
  return achados;
}

(async () => {
  let total = 0;
  for (const chave of chaves) total += await coletarRede(chave);
  if (total === 0) {
    console.error('\nNenhum preço coletado. Veja as mensagens acima.');
    process.exit(1);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
