const puppeteer = require('puppeteer');

async function rasparGuanabara() {
  // Mudamos para headless: false para passar pelo firewall do site
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-position=2000,2000', // Joga a janela para fora da sua tela visível
      '--window-size=1366,768'
    ] 
  });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    // Carrega o site esperando o HTML principal
    await page.goto('https://supermercadosguanabara.com.br', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Aguarda os elementos do encarte surgirem na estrutura
    await page.waitForSelector('.name', { timeout: 15000 });

    const produtos = await page.evaluate(() => {
      const listaDeOfertas = [];
      const itens = document.querySelectorAll('li');

      itens.forEach(item => {
        const elementoNome = item.querySelector('.name');
        const elementoPreco = item.querySelector('.number');

        if (elementoNome && elementoPreco) {
          const nomeClean = elementoNome.textContent.replace(/\s+/g, ' ').trim();
          const precoRaw = elementoPreco.textContent.trim();

          if (nomeClean && precoRaw) {
            const precoClean = parseFloat(precoRaw.replace(',', '.'));
            
            if (!isNaN(precoClean) && !listaDeOfertas.some(p => p.nome === nomeClean)) {
              listaDeOfertas.push({
                nome: nomeClean,
                preco: precoClean,
                supermercado: 'Guanabara'
              });
            }
          }
        }
      });

      return listaDeOfertas;
    });

    await browser.close();
    return produtos;

  } catch (error) {
    console.error("❌ Erro ao raspar dados do Guanabara:", error.message);
    await browser.close();
    return [];
  }
}

module.exports = { rasparGuanabara };
