const { rasparCarrefour } = require('./src/services/carrefourService');
const fs = require('fs');
const path = require('path');

// Testando com apenas 1 produto por enquanto
const listaProdutosDesejados = [
  "Arroz Branco 5kg"
];

console.log("🚀 Iniciando teste unitário no Carrefour... Aguarde.");

rasparCarrefour(listaProdutosDesejados).then(produtos => {
  if (!produtos || produtos.length === 0) {
    console.log("⚠️ Nenhum produto foi capturado.");
    return;
  }

  console.log(`\n✅ Total de itens capturados: ${produtos.length}`);

  const pastaDados = path.join(__dirname, 'dados');
  if (!fs.existsSync(pastaDados)) {
    fs.mkdirSync(pastaDados, { recursive: true });
  }

  let conteudoCSV = "produto;preco;supermercado\n";

  produtos.forEach(item => {
    const precoFormatado = item.preco.toFixed(2).replace('.', ',');
    conteudoCSV += `"${item.nome}";"${precoFormatado}";"${item.supermercado}"\n`;
  });

  const agora = new Date();
  const dataHoje = agora.toISOString().split('T')[0];
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  const segundos = String(agora.getSeconds()).padStart(2, '0');
  
  const nomeArquivo = `${dataHoje}_${horas}-${minutos}-${segundos}_carrefour_teste.csv`;
  const caminhoDestino = path.join(pastaDados, nomeArquivo);

  fs.writeFileSync(caminhoDestino, conteudoCSV, 'utf-8');

  console.log(`\n💾 Arquivo de teste gerado com sucesso em: \\dados\\${nomeArquivo}`);

}).catch(err => {
  console.error("❌ Erro durante o teste:", err);
});