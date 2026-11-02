const test = require('node:test');
const assert = require('node:assert/strict');
const pao = require('../coletor/redes/paodeacucar');
const { filtrar, motivoDescarte } = require('../coletor/normalizar');
const itens = require('../coletor/itens');

const arroz = itens.find((i) => i.nome === 'Arroz Branco');

// Trecho da resposta REAL capturada no navegador (busca "arroz"), mais dois casos de teste.
const resposta = {
  totalPages: 13,
  totalProducts: 147,
  products: [
    { id: 41329, stock: true, priceType: 'P', price: 31.99, sku: '0791595', brand: 'CAMIL', urlDetails: 'https://www.paodeacucar.com/produto/41329/arroz-agulhinha-tipo-1-camil-pacote-5kg', name: 'Arroz Agulhinha Tipo 1 CAMIL Pacote 5kg', variableWeight: false },
    { id: 31117, stock: true, priceType: 'P', price: 8.29, sku: '0154093', brand: 'TIO JOÃO', urlDetails: 'https://www.paodeacucar.com/produto/31117/x', name: 'Arroz Agulhinha Tipo 1 Tio João Pacote 1kg', variableWeight: false },
    { id: 138068, stock: true, priceType: 'O', price: 32.99, priceFrom: 36.99, sku: '0132817', brand: 'TIO JOÃO', urlDetails: 'https://www.paodeacucar.com/produto/138068/x', name: 'Arroz Agulhinha Tipo 1 TIO JOÃO Pacote 5kg', variableWeight: false },
    { id: 107050, stock: true, priceType: 'P', price: 22.99, sku: '6009199', brand: 'QUALITÁ', urlDetails: 'https://www.paodeacucar.com/produto/107050/x', name: 'Arroz Branco Tipo 1 Qualitá Pacote 5kg', variableWeight: false },
    { id: 201984, stock: true, priceType: 'P', price: 24.99, sku: '0151511', brand: 'Solito', urlDetails: 'https://www.paodeacucar.com/produto/201984/x', name: 'Arroz Branco Tipo 1 Solito Pacote 5kg', variableWeight: false },
    { id: 162907, stock: true, priceType: 'P', price: 19.49, sku: '5991495', brand: 'QUALITÁ', urlDetails: 'https://www.paodeacucar.com/produto/162907/x', name: 'Arroz Parboilizado Tipo 1 Qualitá Pacote 5kg', variableWeight: false },
    { id: 139643, stock: true, priceType: 'P', price: 27.99, sku: '0619615', brand: 'CAMIL', urlDetails: 'https://www.paodeacucar.com/produto/139643/x', name: 'Arroz Parboilizado Tipo 1 CAMIL Pacote 5kg', variableWeight: false },
    // casos de teste (não vieram da captura):
    { id: 1, stock: false, priceType: 'P', price: 15.0, sku: 'ESG', brand: 'X', urlDetails: 'u', name: 'Arroz Branco Tipo 1 Esgotado Pacote 5kg', variableWeight: false },
    { id: 2, stock: true, priceType: 'P', price: 9.9, sku: 'KG', brand: 'X', urlDetails: 'u', name: 'Arroz a Granel', variableWeight: true },
  ],
};

const COM_URL = () => { process.env.PAO_URL = 'https://api.exemplo.test/busca'; process.env.PAO_PAUSA_MS = '0'; pao._resetar(); };
const SEM_URL = () => { delete process.env.PAO_URL; };

test('extrai candidatos da resposta real: nome, marca, preço, link e estoque', () => {
  const c = pao.extrairCandidatos(resposta);
  assert.equal(c.length, 8); // o de peso variável fica de fora
  assert.equal(c[0].nome, 'Arroz Agulhinha Tipo 1 CAMIL Pacote 5kg');
  assert.equal(c[0].marca, 'CAMIL');
  assert.equal(c[0].preco, 31.99);
  assert.equal(c[0].semEstoque, false);
  assert.match(c[0].link, /^https:\/\/www\.paodeacucar\.com\/produto\/41329/);
  assert.equal(c.find((x) => x.sku === 'ESG').semEstoque, true);
});

test('arroz branco 5kg: menor preço de qualquer marca, sem parboilizado, sem outro tamanho, sem esgotado', () => {
  const validos = filtrar(pao.extrairCandidatos(resposta), arroz);
  assert.deepEqual(validos.map((v) => v.preco), [22.99, 24.99, 31.99, 32.99]);
  assert.equal(validos[0].marca, 'QUALITÁ');
});

test('produto esgotado é explicado como "sem estoque"', () => {
  const esgotado = pao.extrairCandidatos(resposta).find((x) => x.sku === 'ESG');
  assert.equal(motivoDescarte(esgotado, arroz), 'sem estoque');
});

test('corpo do pedido igual ao do navegador', () => {
  const corpo = pao.montarCorpo({ storeId: 461, porPagina: 12, userHash: '' }, 'arroz', 2);
  assert.deepEqual(corpo, {
    terms: 'arroz', page: 2, sortBy: 'relevance', resultsPerPage: 12,
    allowRedirect: true, customerPlus: true, department: 'ecom', partner: 'fallback', storeId: 461,
  });
  assert.equal(pao.montarCorpo({ storeId: 1, porPagina: 12, userHash: 'abc' }, 'x', 1).userHash, 'abc');
});

test('sem PAO_URL: avisa o que falta, sem chamar o site', async () => {
  SEM_URL();
  assert.equal(pao.configurada(), false);
  await assert.rejects(() => pao.candidatosDoItem({ termo: 'a', tamanho: '1kg' }), /PAO_URL/);
});

test('percorre as páginas até totalPages e para', async () => {
  COM_URL();
  const original = global.fetch;
  const paginas = [];
  global.fetch = async (url, opcoes) => {
    const corpo = JSON.parse(opcoes.body);
    paginas.push(`${corpo.terms}#${corpo.page}`);
    assert.equal(opcoes.method, 'POST');
    return { status: 200, ok: true, json: async () => ({ totalPages: 3, products: [] }) };
  };
  try {
    assert.equal(pao.configurada(), true);
    await pao.candidatosDoItem({ termo: 'x', tamanho: 'y', extras: [] });
    assert.deepEqual(paginas, ['x#1', 'x#2', 'x#3', 'x y#1', 'x y#2', 'x y#3']);
  } finally { global.fetch = original; SEM_URL(); }
});

test('recusa do site (403) aparece uma vez e não é repetida nos próximos itens', async () => {
  COM_URL();
  const original = global.fetch;
  let chamadas = 0;
  global.fetch = async () => { chamadas++; return { status: 403, ok: false, json: async () => ({}) }; };
  try {
    await assert.rejects(() => pao.candidatosDoItem({ termo: 'x', tamanho: 'y' }), /HTTP 403/);
    await assert.rejects(() => pao.candidatosDoItem({ termo: 'z', tamanho: 'y' }), /HTTP 403/);
    assert.equal(chamadas, 1);
  } finally { global.fetch = original; SEM_URL(); pao._resetar(); }
});

test('nome da rede igual ao que será cadastrado no banco', () => {
  assert.equal(pao.nomeRede, 'Pão de Açúcar');
});

test('404 depois de um pedido aceito = busca sem resultados; o item seguinte continua', async () => {
  COM_URL();
  const original = global.fetch;
  let n = 0;
  global.fetch = async () => {
    n++;
    if (n === 1) return { status: 200, ok: true, json: async () => ({ totalPages: 1, products: [{ name: 'Arroz Branco 5kg', brand: 'X', price: 20, stock: true, sku: 'A', urlDetails: 'u' }] }) };
    return { status: 404, ok: false, json: async () => ({}) };
  };
  try {
    const a = await pao.candidatosDoItem({ termo: 'arroz', tamanho: '5kg', extras: [] }); // 1º termo ok, 2º termo 404
    assert.equal(a.length, 1);
    const b = await pao.candidatosDoItem({ termo: 'biscoito', tamanho: '400g', extras: [] }); // tudo 404, mas não é fatal
    assert.deepEqual(b, []);
  } finally { global.fetch = original; SEM_URL(); pao._resetar(); }
});

test('404 logo no primeiro pedido continua sendo erro de endereço', async () => {
  COM_URL();
  const original = global.fetch;
  global.fetch = async () => ({ status: 404, ok: false, json: async () => ({}) });
  try {
    await assert.rejects(() => pao.candidatosDoItem({ termo: 'x', tamanho: 'y' }), /HTTP 404/);
  } finally { global.fetch = original; SEM_URL(); pao._resetar(); }
});
