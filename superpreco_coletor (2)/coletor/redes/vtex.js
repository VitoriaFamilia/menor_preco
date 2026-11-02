// Coletor genérico para sites VTEX com a API pública de catálogo.
// Prezunic, Atacadão e outras redes VTEX usam este mesmo código, mudando só o endereço.

const PAUSA_ENTRE_PEDIDOS_MS = 500;
const PRODUTOS_POR_PAGINA = 50;
const MAX_PAGINAS = 3; // até 150 resultados por busca
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const CABECALHOS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

// Faz o pedido com até 3 tentativas. 429 (muitos pedidos) espera mais antes de tentar de novo.
async function buscarJson(url, tentativas = 3) {
  let ultimoErro;
  for (let i = 1; i <= tentativas; i++) {
    try {
      const res = await fetch(url, { headers: CABECALHOS });
      if (res.status === 429) { await dormir(5000 * i); ultimoErro = new Error('HTTP 429'); continue; }
      if (res.status === 404 || res.status === 400) return [];
      if (!res.ok) throw new Error(`HTTP ${res.status}`); // 200 e 206 (parcial) são normais na VTEX
      const dados = await res.json();
      return Array.isArray(dados) ? dados : [];
    } catch (e) {
      ultimoErro = e;
      await dormir(1500 * i);
    }
  }
  throw new Error(`Falha ao consultar ${url}: ${ultimoErro?.message}`);
}

// Transforma a resposta da VTEX em uma lista simples de candidatos {nome, marca, preco, link, sku}.
// Usa o menor preço entre os vendedores que têm estoque.
function extrairCandidatos(produtos) {
  const saida = [];
  for (const p of produtos || []) {
    for (const item of p.items || []) {
      let preco = null;      // menor preço entre vendedores COM estoque
      let precoSemEstoque = null; // preço de vitrine quando está esgotado
      for (const s of item.sellers || []) {
        const o = s.commertialOffer;
        if (!o || !(o.Price > 0)) continue;
        if (o.AvailableQuantity > 0) preco = preco === null ? o.Price : Math.min(preco, o.Price);
        else precoSemEstoque = precoSemEstoque === null ? o.Price : Math.min(precoSemEstoque, o.Price);
      }
      // Produto esgotado também entra na lista (marcado), para o diagnóstico mostrar o que falta no estoque.
      if (preco !== null || precoSemEstoque !== null) {
        saida.push({
          nome: item.nameComplete || p.productName || item.name || '',
          marca: p.brand || '',
          preco: preco !== null ? preco : precoSemEstoque,
          semEstoque: preco === null,
          link: p.link || '',
          sku: item.itemId || '',
        });
      }
    }
  }
  return saida;
}

// consultaExtra: parâmetros a mais na busca, se a rede exigir (ex.: "sc=2" para o canal de vendas).
function criarColetorVtex({ nomeRede, baseUrl, consultaExtra = '' }) {
  const extra = String(consultaExtra || '').replace(/^[?&]/, '');
  return {
    nomeRede,
    baseUrl,
    consultaExtra: extra,
    // Faz várias buscas (termo, termo + tamanho, extras), com até 3 páginas cada, e junta tudo.
    async candidatosDoItem(item) {
      const termos = [...new Set([item.termo, `${item.termo} ${item.tamanho}`, ...(item.extras || [])])];
      const todos = new Map();
      for (const termo of termos) {
        for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
          const de = pagina * PRODUTOS_POR_PAGINA;
          const url = `${baseUrl}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(termo)}&_from=${de}&_to=${de + PRODUTOS_POR_PAGINA - 1}${extra ? `&${extra}` : ''}`;
          const produtos = await buscarJson(url);
          for (const c of extrairCandidatos(produtos)) todos.set(`${c.sku}|${c.nome}`, c);
          await dormir(PAUSA_ENTRE_PEDIDOS_MS);
          if (produtos.length < PRODUTOS_POR_PAGINA) break; // acabaram os resultados
        }
      }
      return [...todos.values()];
    },
  };
}

module.exports = { criarColetorVtex, extrairCandidatos, buscarJson };
