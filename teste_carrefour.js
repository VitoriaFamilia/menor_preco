const { rasparCarrefour } = require('./src/services/carrefourService');
const fs = require('fs');
const path = require('path');

// Lista dos 18 produtos essenciais para busca
const listaProdutosDesejados = [
  "Arroz Branco 5kg",
  "Feijão Preto 1kg",
  "Açúcar Refinado 1kg",
  "Óleo de Soja 900ml",
  "Café Torrado 500g",
  "Leite Integral 1L",
  "Macarrão Espaguete 500g",
  "Farinha de Trigo 1kg",
  "Sal Refinado 1kg",
  "Biscoito Cream Cracker 400g",
  "Margarina 500g",
  "Ovos 12 un",
  "Extrato de Tomate 340g",
  "Detergente Líquido 500ml",
  "Sabão em Pó 1kg",
  "Água Sanitária 1L",
  "Papel Higiênico 12 rolos",
  "Sabonete 85g"
];

console.log("🚀 Iniciando a coleta direcionada no Carrefour... Aguarde.");

rasparCarrefour(listaProdutosDesejados).then(produtos => {
  if (!produtos || produtos.length === 0) {
    console.log("⚠️ Nenhum produto foi capturado.");
    return;
  }

  console.log(`\n✅ Total de itens capturados no Carrefour: ${produtos.length}`);

  // 1. Garante que a pasta 'dados' existe
  const pastaDados = path.join(__dirname, 'dados');
  if (!fs.existsSync(pastaDados)) {
    fs.mkdirSync(pastaDados, { recursive: true });
  }

  // 2. Cria o cabeçalho do arquivo CSV
  let conteudoCSV = "produto;preco;supermercado\n";

  // 3. Preenche as linhas da planilha
  produtos.forEach(item => {
    const precoFormatado = item.preco.toFixed(2).replace('.', ',');
    conteudoCSV += `"${item.nome}";"${precoFormatado}";"${item.supermercado}"\n`;
  });

  // 4. Data e hora atuais para nunca sobrescrever arquivos antigos
  const agora = new Date();
  const dataHoje = agora.toISOString().split('T')[0];
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  const segundos = String(agora.getSeconds()).padStart(2, '0');
  
  const nomeArquivo = `${dataHoje}_${horas}-${minutos}-${segundos}_carrefour.csv`;
  const caminhoDestino = path.join(pastaDados, nomeArquivo);

  // 5. Salva o arquivo CSV
  fs.writeFileSync(caminhoDestino, conteudoCSV, 'utf-8');

  console.log(`\n💾 Planilha gerada com sucesso em: \\dados\\${nomeArquivo}`);
  console.log("Excel pronto para visualização!");

}).catch(err => {
  console.error("❌ Erro durante a execução:", err);
});