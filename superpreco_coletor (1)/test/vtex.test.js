const test = require('node:test');
const assert = require('node:assert/strict');
const { criarColetorVtex } = require('../coletor/redes/vtex');

function simularSite(resposta = []) {
  const urls = [];
  const original = global.fetch;
  global.fetch = async (url) => { urls.push(url); return { status: 200, ok: true, json: async () => resposta }; };
  return { urls, restaurar: () => { global.fetch = original; } };
}

const item = { termo: 'arroz', tamanho: '5kg', extras: [] };

test('monta a URL da busca VTEX com paginação', async () => {
  const s = simularSite([]);
  try {
    const rede = criarColetorVtex({ nomeRede: 'Teste', baseUrl: 'https://www.exemplo.com.br' });
    await rede.candidatosDoItem(item);
    assert.equal(s.urls.length, 2); // "arroz" e "arroz 5kg", 1 página cada (menos de 50 resultados)
    assert.match(s.urls[0], /^https:\/\/www\.exemplo\.com\.br\/api\/catalog_system\/pub\/products\/search\?ft=arroz&_from=0&_to=49$/);
    assert.match(s.urls[1], /ft=arroz%205kg/);
  } finally { s.restaurar(); }
});

test('parâmetros extras (ex.: sc=2) entram em toda busca', async () => {
  const s = simularSite([]);
  try {
    const rede = criarColetorVtex({ nomeRede: 'Teste', baseUrl: 'https://x.com.br', consultaExtra: '?sc=2' });
    await rede.candidatosDoItem(item);
    assert.ok(s.urls.every((u) => u.endsWith('&sc=2')));
    assert.equal(rede.consultaExtra, 'sc=2');
  } finally { s.restaurar(); }
});

test('Atacadão está configurado com o nome igual ao do banco', () => {
  const atacadao = require('../coletor/redes/atacadao');
  assert.equal(atacadao.nomeRede, 'Atacadão');
  assert.equal(atacadao.baseUrl, 'https://www.atacadao.com.br');
});

test('busca pagina enquanto vierem 50 produtos e para quando vier menos', async () => {
  const cheio = Array.from({ length: 50 }, (_, i) => ({
    productName: `Arroz ${i}`, items: [{ itemId: `${i}`, sellers: [{ commertialOffer: { Price: 10, AvailableQuantity: 5 } }] }],
  }));
  let chamadas = 0;
  const original = global.fetch;
  global.fetch = async (url) => {
    chamadas++;
    const pagina = Number(/_from=(\d+)/.exec(url)[1]) / 50;
    return { status: 206, ok: true, json: async () => (pagina < 2 ? cheio : []) };
  };
  try {
    const rede = criarColetorVtex({ nomeRede: 'Teste', baseUrl: 'https://x.com.br' });
    await rede.candidatosDoItem({ termo: 'arroz', tamanho: 'zzz' });
    // termo "arroz": 3 páginas (50, 50, 0) ; termo "arroz zzz": 3 páginas -> 6 chamadas
    assert.equal(chamadas, 6);
  } finally { global.fetch = original; }
});
