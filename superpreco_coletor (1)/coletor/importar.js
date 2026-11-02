// Lê o CSV mais recente de cada rede (pasta /dados) e grava os preços na tabela precos.
//
//   node coletor/importar.js                          -> o CSV mais recente de cada rede
//   node coletor/importar.js dados/2026-10-26_prezunic.csv   -> um arquivo específico
//
// O preço vale para a REDE inteira: é gravado na filial de menor id da rede
// (a API usa o menor preço registrado para a rede).

const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../src/config/db');

const pasta = path.join(__dirname, '..', 'dados');

function arquivosParaImportar() {
  if (process.argv[2]) return [path.resolve(process.argv[2])];
  const porRede = new Map();
  for (const nome of fs.readdirSync(pasta).filter((n) => /^\d{4}-\d{2}-\d{2}_.+\.csv$/.test(n)).sort()) {
    porRede.set(nome.split('_').slice(1).join('_'), nome); // o último (mais recente) de cada rede vence
  }
  return [...porRede.values()].map((n) => path.join(pasta, n));
}

function lerCsv(arquivo) {
  const [cab, ...linhas] = fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const colunas = cab.split(';');
  return linhas.map((l) => Object.fromEntries(l.split(';').map((v, i) => [colunas[i], v])));
}

(async () => {
  const arquivos = arquivosParaImportar();
  if (!arquivos.length) { console.log('Nenhum CSV em /dados. Rode antes: node coletor/coletar.js'); return; }

  const [produtos] = await db.query('SELECT id_produto, nome FROM produtos');
  const idPorNome = new Map(produtos.map((p) => [p.nome, p.id_produto]));
  const idMercadoPorRede = new Map();

  for (const arquivo of arquivos) {
    let gravados = 0, semPreco = 0, semProduto = 0;
    const linhas = lerCsv(arquivo);
    console.log(`\n${path.basename(arquivo)}`);

    for (const l of linhas) {
      if (!l.preco) { semPreco++; continue; }
      const idProduto = idPorNome.get(l.item);
      if (!idProduto) { console.log(`  ! Produto "${l.item}" não existe na tabela produtos`); semProduto++; continue; }

      if (!idMercadoPorRede.has(l.rede)) {
        const [[r]] = await db.query('SELECT MIN(id_mercado) AS id FROM mercados WHERE nome_rede = ?', [l.rede]);
        idMercadoPorRede.set(l.rede, r?.id ?? null);
      }
      const idMercado = idMercadoPorRede.get(l.rede);
      if (!idMercado) { console.log(`  ! Rede "${l.rede}" não existe na tabela mercados`); break; }

      await db.query(
        'INSERT INTO precos (id_produto, id_mercado, preco) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE preco = VALUES(preco)',
        [idProduto, idMercado, Number(l.preco)]
      );
      gravados++;
    }
    console.log(`  ${gravados} preços gravados, ${semPreco} itens sem preço, ${semProduto} produtos não encontrados.`);
  }
})()
  .catch((e) => { console.error('Erro ao importar:', e.message); process.exitCode = 1; })
  .finally(() => db.end && db.end());
