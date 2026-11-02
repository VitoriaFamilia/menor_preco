const { rasparGuanabara } = require('./src/services/guanabaraService');
const fs = require('fs');
const path = require('path');

console.log("🚀 Iniciando a raspagem do Guanabara... Aguarde.");

rasparGuanabara().then(produtos => {
  if (!produtos || produtos.length === 0) {
    console.log("⚠️ Nenhum produto foi capturado.");
    return;
  }

  console.log(`\n✅ Total de itens capturados: ${produtos.length}`);

  // 1. Cria o cabeçalho do arquivo CSV
  let conteudoCSV = "produto;preco;supermercado\n";

  // 2. Percorre a lista alimentando as linhas do arquivo
  produtos.forEach(item => {
    // Converte o ponto de volta para vírgula caso queira abrir direto no Excel em PT-BR
    const precoFormatado = item.preco.toString().replace('.', ',');
    conteudoCSV += `"${item.nome}";"${precoFormatado}";"${item.supermercado}"\n`;
  });

  // 3. Define a data de hoje para o nome do arquivo (Ex: 2026-11-02_guanabara.csv)
  const dataHoje = new Date().toISOString().split('T')[0];
  const nomeArquivo = `${dataHoje}_guanabara.csv`;
  
  // 4. Salva o arquivo diretamente dentro da sua pasta "dados"
  const caminhoDestino = path.join(__dirname, 'dados', nomeArquivo);

  fs.writeFileSync(caminhoDestino, conteudoCSV, 'utf-8');

  console.log(`\n💾 Arquivo gerado com sucesso em: \\dados\\${nomeArquivo}`);
  console.log("Excel pronto para visualização!");

}).catch(err => {
  console.error("❌ Erro durante o teste:", err);
});
