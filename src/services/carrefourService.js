const puppeteer = require('puppeteer');

const alvosCarrefour = [
  { nomeBusca: "Arroz Branco 5kg", url: "https://mercado.carrefour.com.br/busca/arroz%205kg?sort=price_asc", obrigatorio: ["arroz"] },
  { nomeBusca: "Feijão Preto 1kg", url: "https://mercado.carrefour.com.br/busca/feijao%20preto%201%20kilo?sort=price_asc", obrigatorio: ["feijão", "feijao"] },
  { nomeBusca: "Açúcar Refinado 1kg", url: "https://mercado.carrefour.com.br/busca/a%C3%A7ucar%20refinado%201kg?sort=price_asc", obrigatorio: ["açúcar", "acucar"] },
  { nomeBusca: "Óleo de Soja 900ml", url: "https://mercado.carrefour.com.br/busca/oleo%20de%20soja%20900ml?sort=price_asc", obrigatorio: ["óleo", "oleo"] },
  { nomeBusca: "Café Torrado 500g", url: "https://mercado.carrefour.com.br/busca/cafe%20torrado%20500g?sort=price_asc", obrigatorio: ["café", "cafe"] },
  { nomeBusca: "Leite Integral 1L", url: "https://mercado.carrefour.com.br/busca/leite%20integral?sort=price_asc", obrigatorio: ["leite"] },
  { nomeBusca: "Macarrão Espaguete 500g", url: "https://mercado.carrefour.com.br/busca/macarrao%20espaguete%20500g?sort=price_asc", obrigatorio: ["macarrão", "macarrao", "espaguete"] },
  { nomeBusca: "Farinha de Trigo 1kg", url: "https://mercado.carrefour.com.br/busca/farinha%20trigo%201%20kilo?sort=price_asc", obrigatorio: ["farinha"] },
  { nomeBusca: "Sal Refinado 1kg", url: "https://mercado.carrefour.com.br/busca/sal%20refinado%201kg?sort=price_asc", obrigatorio: ["sal"] },
  { nomeBusca: "Biscoito Cream Cracker 400g", url: "https://mercado.carrefour.com.br/busca/Biscoito%20Cream%20Cracker?sort=price_asc", obrigatorio: ["biscoito", "cracker"] },
  { nomeBusca: "Margarina 500g", url: "https://mercado.carrefour.com.br/busca/margarina%20500g?sort=price_asc", obrigatorio: ["margarina"] },
  { nomeBusca: "Ovos 12 un", url: "https://mercado.carrefour.com.br/busca/ovos%20da%20granja?sort=price_asc", obrigatorio: ["ovo", "ovos"] },
  { nomeBusca: "Extrato de Tomate 340g", url: "https://mercado.carrefour.com.br/busca/extrato%20de%20tomate?sort=price_asc", obrigatorio: ["extrato", "tomate"] },
  { nomeBusca: "Detergente Líquido 500ml", url: "https://mercado.carrefour.com.br/busca/detergente%20liquido%20500ml?sort=price_asc", obrigatorio: ["detergente"] },
  { nomeBusca: "Sabão em Pó 1kg", url: "https://mercado.carrefour.com.br/busca/sabao%20em%20po?sort=price_asc", obrigatorio: ["sabão", "sabao", "omô", "brilhante", "ypê"] },
  { nomeBusca: "Água Sanitária 1L", url: "https://mercado.carrefour.com.br/busca/agua%20sanitaria%201l?sort=price_asc", obrigatorio: ["água sanitária", "agua sanitaria", "sanitária", "sanitaria"] },
  { nomeBusca: "Papel Higiênico 12 rolos", url: "https://mercado.carrefour.com.br/busca/papel%20higienico%2012?sort=price_asc", obrigatorio: ["papel higiênico", "papel higienico", "papel"] },
  { nomeBusca: "Sabonete 85g", url: "https://mercado.carrefour.com.br/busca/sabonete?sort=price_asc", obrigatorio: ["sabonete"] }
];

async function rasparCarrefour() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-position=2000,2000',
      '--window-size=1366,768'
    ] 
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const resultadosFinais = [];

  try {
    for (const alfo of alvosCarrefour) {
      console.log(`🔎 Buscando o mais barato para: ${alfo.nomeBusca}...`);
      
      try {
        await page.goto(alfo.url, { waitUntil: 'networkidle2', timeout: 35000 });
        await page.waitForSelector('[data-testid="search-product-card"]', { timeout: 12000 }).catch(() => null);

        const produtosEncontrados = await page.evaluate(() => {
          const lista = [];
          const cards = document.querySelectorAll('[data-testid="search-product-card"]');
          
          let contador = 0;
          cards.forEach(card => {
            if (contador >= 20) return; // Ampliado para os primeiros 20 itens
            const elNome = card.querySelector('h2');
            const elPreco = card.querySelector('.text-price-default');

            if (elNome && elPreco) {
              const nome = elNome.textContent.replace(/\s+/g, ' ').trim();
              const precoTexto = elPreco.textContent.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.').trim();
              const preco = parseFloat(precoTexto);

              if (nome && !isNaN(preco)) {
                lista.push({ nome, preco });
                contador++;
              }
            }
          });
          return lista;
        });

        // Trava Estrita Anti-Erro
        const itemValido = produtosEncontrados.find(p => {
          const nomeLower = p.nome.toLowerCase();

          // Exclusões Globais de Anúncios e Acessórios
          if (nomeLower.includes("sacola") || nomeLower.includes("esponja") || nomeLower.includes("colher") || nomeLower.includes("cápsula") || nomeLower.includes("refresco")) {
            return false;
          }

          // Valida Palavra-Chave Obrigatória
          const temPalavraChave = alfo.obrigatorio.some(palavra => nomeLower.includes(palavra));
          if (!temPalavraChave) return false;

          // Regras Específicas
          if (alfo.nomeBusca.includes("Ovos") && (nomeLower.includes("macarrão") || nomeLower.includes("macarrao") || nomeLower.includes("codorna"))) {
            return false;
          }
          if (alfo.nomeBusca.includes("Farinha") && nomeLower.includes("melhorador")) {
            return false;
          }
          if (alfo.nomeBusca.includes("Sabão em Pó") && (nomeLower.includes("líquido") || nomeLower.includes("liquido") || nomeLower.includes("barra"))) {
            return false;
          }
          if (alfo.nomeBusca.includes("Arroz") && (nomeLower.includes("dog") || nomeLower.includes("cat"))) {
            return false;
          }

          return true;
        });

        if (itemValido) {
          resultadosFinais.push({
            nome: itemValido.nome,
            preco: itemValido.preco,
            supermercado: 'Carrefour'
          });
          console.log(`   ✅ Selecionado: ${itemValido.nome} por R$ ${itemValido.preco.toFixed(2).replace('.', ',')}`);
        } else {
          console.log(`   ⚠️ Nenhum item válido encontrado para ${alfo.nomeBusca}`);
        }

      } catch (errItem) {
        console.log(`   ❌ Erro ao buscar ${alfo.nomeBusca}:`, errItem.message);
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    await browser.close();
    return resultadosFinais;

  } catch (error) {
    console.error("❌ Erro geral na varredura:", error.message);
    await browser.close();
    return resultadosFinais;
  }
}

module.exports = { rasparCarrefour };