const puppeteer = require('puppeteer');

async function rasparSupermarket() {
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

  try {
    await page.goto('https://redesupermarket.com.br/ofertas/', {
      waitUntil: 'networkidle2',
      timeout: 40000
    });

    // Aguarda o primeiro card aparecer
    await page.waitForSelector('.card-product', { timeout: 20000 });

    // Função robusta de rolagem para baixo em etapas para disparar o carregamento de todos os produtos da página
    console.log("📜 Rolando a página para carregar todos os produtos...");
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 400;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });

    // Pausa maior para garantir a renderização completa de todas as imagens e textos dos cards
    await new Promise(r => setTimeout(r, 4000));

    const produtos = await page.evaluate(() => {
      const listaDeOfertas = [];
      const cards = document.querySelectorAll('.card-product');

      cards.forEach(card => {
        const elementoNome = card.querySelector('.card-product__title');
        // Se houver preço de clube/desconto e preço normal, priorizamos ou pegamos o principal
        const elementoPrecoMain = card.querySelector('.card-product__price-main');
        const elementoPrecoDecimal = card.querySelector('.card-product__price-sup--decimal');

        if (elementoNome && elementoPrecoMain) {
          const nomeClean = elementoNome.textContent.replace(/\s+/g, ' ').trim();
          
          const parteInteira = elementoPrecoMain.textContent.trim();
          const parteDecimal = elementoPrecoDecimal ? elementoPrecoDecimal.textContent.trim() : '00';
          
          const precoString = `${parteInteira}.${parteDecimal}`;
          const precoClean = parseFloat(precoString);

          if (nomeClean && !isNaN(precoClean)) {
            // Evita duplicatas exatas na mesma raspagem
            if (!listaDeOfertas.some(p => p.nome === nomeClean && p.preco === precoClean)) {
              listaDeOfertas.push({
                nome: nomeClean,
                preco: precoClean,
                supermercado: 'Supermarket'
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
    console.error("❌ Erro ao raspar dados do Supermarket:", error.message);
    await browser.close();
    return [];
  }
}

module.exports = { rasparSupermarket };