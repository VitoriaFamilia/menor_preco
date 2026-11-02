// Coletor do Pão de Açúcar (API interna do site: pedido POST de busca que devolve JSON).
//
// O pedido e a resposta foram copiados do próprio navegador (F12 > Network):
//   corpo:    { terms, page, sortBy, resultsPerPage, allowRedirect, customerPlus, department, partner, storeId }
//   resposta: { totalPages, totalProducts, products: [{ name, brand, price, stock, sku, urlDetails, variableWeight }] }
//
// O ENDEREÇO do pedido (Request URL) é informado fora do código, para poder trocar sem editar arquivo:
//   PowerShell:  $env:PAO_URL="https://...";  node coletor/coletar.js paodeacucar --detalhe
//
// Outras opções (todas opcionais):
//   PAO_STORE_ID   loja usada nos preços (padrão 461, a do navegador que fez a captura)
//   PAO_POR_PAGINA produtos por página (padrão 12, igual ao site)
//   PAO_MAX_PAGINAS páginas lidas por busca (padrão 5)
//   PAO_USER_HASH  só se o site recusar o pedido sem ele (identificador da sessão; NÃO compartilhe)

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const CABECALHOS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  Origin: 'https://www.paodeacucar.com',
  Referer: 'https://www.paodeacucar.com/',
};

// Lidas a cada uso (e não ao carregar o arquivo), para as opções valerem sempre.
const config = () => ({
  url: process.env.PAO_URL || '',
  storeId: Number(process.env.PAO_STORE_ID || 461),
  porPagina: Number(process.env.PAO_POR_PAGINA || 12),
  maxPaginas: Number(process.env.PAO_MAX_PAGINAS || 5),
  userHash: process.env.PAO_USER_HASH || '',
  pausaMs: Number(process.env.PAO_PAUSA_MS ?? 500),
});

function montarCorpo(cfg, termo, pagina) {
  const corpo = {
    terms: termo,
    page: pagina,
    sortBy: 'relevance',
    resultsPerPage: cfg.porPagina,
    allowRedirect: true,
    customerPlus: true,
    department: 'ecom',
    partner: 'fallback',
    storeId: cfg.storeId,
  };
  if (cfg.userHash) corpo.userHash = cfg.userHash;
  return corpo;
}

// Resposta do site -> candidatos {nome, marca, preco, semEstoque, link, sku}.
// "price" já é o preço de venda atual (com a promoção, quando priceType = "O").
// Produto de peso variável (vendido por kg, como frutas) fica de fora: o preço não é da embalagem.
function extrairCandidatos(resposta) {
  const saida = [];
  for (const p of (resposta && resposta.products) || []) {
    if (p.variableWeight) continue;
    if (!(Number(p.price) > 0)) continue;
    saida.push({
      nome: p.name || '',
      marca: p.brand || '',
      preco: Number(p.price),
      semEstoque: p.stock === false,
      link: p.urlDetails || '',
      sku: String(p.sku || p.id || ''),
    });
  }
  return saida;
}

// Faz o POST com até 3 tentativas. Recusa do site (401/403) e pedido inválido (400/404) não adiantam repetir.
async function postar(cfg, corpo, tentativas = 3) {
  let ultimo;
  for (let i = 1; i <= tentativas; i++) {
    try {
      const res = await fetch(cfg.url, { method: 'POST', headers: CABECALHOS, body: JSON.stringify(corpo) });
      if (res.status === 401 || res.status === 403) {
        const e = new Error(`HTTP ${res.status}: o site recusou o pedido (pode exigir PAO_USER_HASH ou outro cabeçalho; veja o LEIA-ME)`);
        e.fatal = true;
        throw e;
      }
      if (res.status === 400 || res.status === 404) {
        const e = new Error(`HTTP ${res.status}: endereço ou formato do pedido não aceito (confira PAO_URL)`);
        e.fatal = true;
        throw e;
      }
      if (res.status === 429) { ultimo = new Error('HTTP 429'); await dormir(5000 * i); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (e.fatal) throw e;
      ultimo = e;
      await dormir(1500 * i);
    }
  }
  throw new Error(`Falha ao consultar o Pão de Açúcar: ${ultimo?.message}`);
}

let falhaFatal = null; // depois de uma recusa do site, não insiste nos próximos itens

module.exports = {
  nomeRede: 'Pão de Açúcar',
  configurada: () => Boolean(config().url),
  montarCorpo,
  extrairCandidatos,
  _resetar: () => { falhaFatal = null; },

  async candidatosDoItem(item) {
    const cfg = config();
    if (!cfg.url) throw new Error('Falta o endereço da API do Pão de Açúcar (PAO_URL). Veja o LEIA-ME.');
    if (falhaFatal) throw falhaFatal;

    const termos = [...new Set([item.termo, `${item.termo} ${item.tamanho}`, ...(item.extras || [])])];
    const todos = new Map();
    try {
      for (const termo of termos) {
        for (let pagina = 1; pagina <= cfg.maxPaginas; pagina++) {
          const resposta = await postar(cfg, montarCorpo(cfg, termo, pagina));
          for (const c of extrairCandidatos(resposta)) todos.set(`${c.sku}|${c.nome}`, c);
          await dormir(cfg.pausaMs);
          if (!resposta || pagina >= (resposta.totalPages || 0)) break; // acabaram as páginas
        }
      }
    } catch (e) {
      if (e.fatal) falhaFatal = e;
      throw e;
    }
    return [...todos.values()];
  },
};
