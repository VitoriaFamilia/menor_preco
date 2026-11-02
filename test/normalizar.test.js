const test = require('node:test');
const assert = require('node:assert/strict');
const { lerTamanhos, temTamanho, filtrar, motivoDescarte } = require('../coletor/normalizar');
const { extrairCandidatos } = require('../coletor/redes/vtex');
const itens = require('../coletor/itens');

const item = (nome) => itens.find((i) => i.nome === nome);
const c = (nome, preco) => ({ nome, preco, marca: '', link: '', sku: nome });

test('lê massa, volume e unidades', () => {
  assert.deepEqual(lerTamanhos('Arroz Tio João 5kg').massa, [5000]);
  assert.deepEqual(lerTamanhos('Feijão 1,5 Kg').massa, [1500]);
  assert.deepEqual(lerTamanhos('Óleo de Soja 900 ml').volume, [900]);
  assert.deepEqual(lerTamanhos('Leite 1L').volume, [1000]);
  assert.deepEqual(lerTamanhos('Ovos Brancos 12 Unidades').unidade, [12]);
  assert.deepEqual(lerTamanhos('Papel Higiênico 12 Rolos').unidade, [12]);
});

test('tamanho exato: aceita o de referência e recusa os outros', () => {
  assert.equal(temTamanho('Arroz Branco Tipo 1 5kg', '5kg'), true);
  assert.equal(temTamanho('Arroz Branco Tipo 1 1kg', '5kg'), false);
  assert.equal(temTamanho('Óleo de Soja 900ml', '900ml'), true);
  assert.equal(temTamanho('Café 500g', '500g'), true);
  assert.equal(temTamanho('Café 250g', '500g'), false);
});

test('kit ou caixa não vale para item de peso/volume', () => {
  assert.equal(temTamanho('Leite Integral 1L Caixa c/12', '1L'), false);
  assert.equal(temTamanho('Leite Integral 12x1L', '1L'), false);
  assert.equal(temTamanho('Sabonete 85g Leve 6', '85g'), false);
  assert.equal(temTamanho('Sabonete 85g 12 un', '85g'), false);
  assert.equal(temTamanho('Leite Integral 1L', '1L'), true);
});

test('ovos e papel: o número de unidades é o tamanho', () => {
  assert.equal(temTamanho('Ovos Brancos Grandes c/12', '12 un'), true);
  assert.equal(temTamanho('Ovos 30 unidades', '12 un'), false);
  assert.equal(temTamanho('Papel Higiênico Folha Dupla 30m 12 Rolos', '12 rolos'), true);
  assert.equal(temTamanho('Papel Higiênico 4 Rolos', '12 rolos'), false);
});

test('arroz: pega o branco de 5kg mais barato e ignora integral/parboilizado/outros tamanhos', () => {
  const lista = [
    c('Arroz Branco Tipo 1 Marca A 5kg', 29.9),
    c('Arroz Branco Tipo 1 Marca B 5kg', 26.5),
    c('Arroz Integral Marca C 5kg', 18.0),
    c('Arroz Parboilizado Marca D 5kg', 20.0),
    c('Arroz Branco Marca E 1kg', 5.0),
  ];
  const v = filtrar(lista, item('Arroz Branco'));
  assert.equal(v.length, 2);
  assert.equal(v[0].preco, 26.5);
});

test('leite integral: ignora desnatado, sem lactose, condensado e em pó', () => {
  const lista = [
    c('Leite Integral UHT 1L', 5.2),
    c('Leite Desnatado UHT 1L', 4.0),
    c('Leite Integral Zero Lactose 1L', 6.0),
    c('Leite Condensado Integral 1L', 3.0),
    c('Leite Integral em Pó 1L', 2.0),
  ];
  const v = filtrar(lista, item('Leite Integral'));
  assert.deepEqual(v.map((x) => x.preco), [5.2]);
});

test('sal refinado não pega salgadinho nem sal grosso', () => {
  const lista = [c('Sal Refinado Iodado 1kg', 2.5), c('Sal Grosso 1kg', 2.0), c('Salgadinho Refinado 1kg', 1.0)];
  assert.deepEqual(filtrar(lista, item('Sal Refinado')).map((x) => x.preco), [2.5]);
});

test('sem candidato válido devolve lista vazia', () => {
  assert.deepEqual(filtrar([c('Arroz Branco 1kg', 5)], item('Arroz Branco')), []);
  assert.deepEqual(filtrar([], item('Arroz Branco')), []);
});

test('todos os itens têm tamanho de referência válido', () => {
  for (const i of itens) {
    assert.doesNotThrow(() => temTamanho('x', i.tamanho), i.nome);
    assert.ok(i.deve.length > 0, i.nome);
  }
  assert.equal(itens.length, 18);
});

test('VTEX: usa o menor preço com estoque e ignora indisponível', () => {
  const resposta = [{
    productName: 'Arroz Branco Tipo 1 5kg', brand: 'X', link: '/arroz/p',
    items: [{
      itemId: '1', nameComplete: 'Arroz Branco Tipo 1 5kg',
      sellers: [
        { commertialOffer: { Price: 30, AvailableQuantity: 10 } },
        { commertialOffer: { Price: 25, AvailableQuantity: 5 } },
        { commertialOffer: { Price: 10, AvailableQuantity: 0 } },
      ],
    }],
  }, {
    productName: 'Sem estoque', items: [{ itemId: '2', sellers: [{ commertialOffer: { Price: 9, AvailableQuantity: 0 } }] }],
  }];
  const r = extrairCandidatos(resposta);
  assert.equal(r.length, 2);
  assert.equal(r[0].preco, 25);
  assert.equal(r[0].semEstoque, false);
  assert.equal(r[1].semEstoque, true); // esgotado: entra marcado, para o diagnóstico mostrar
});

test('novos formatos de tamanho: kgs, 12 ovos, dúzia', () => {
  assert.deepEqual(lerTamanhos('Arroz 5kgs').massa, [5000]);
  assert.deepEqual(lerTamanhos('12 Ovos Brancos').unidade, [12]);
  assert.deepEqual(lerTamanhos('1 Dúzia de Ovos').unidade, [12]);
  assert.equal(temTamanho('Ovos Vermelhos 1 Dúzia', '12 un'), true);
  assert.equal(temTamanho('Água Sanitária 1000ml', '1L'), true);
});

test('marca não interfere: o menor preço vence, seja qual for a marca', () => {
  const lista = [
    { nome: 'Feijão Preto Marca Cara 1kg', marca: 'Cara', preco: 12, link: '', sku: 'a' },
    { nome: 'Feijão Preto Marca Barata 1kg', marca: 'Barata', preco: 6.5, link: '', sku: 'b' },
    { nome: 'Feijão Preto Marca Média 1kg', marca: 'Media', preco: 8, link: '', sku: 'c' },
  ];
  const v = filtrar(lista, item('Feijão Preto'));
  assert.equal(v[0].marca, 'Barata');
  assert.equal(v[0].preco, 6.5);
  assert.equal(v.length, 3);
});

test('café: em grãos também é café torrado; solúvel não', () => {
  const lista = [c('Café Torrado em Grãos 500g', 20), c('Café Solúvel 500g', 10), c('Café Torrado e Moído 500g', 22)];
  assert.deepEqual(filtrar(lista, item('Café Torrado')).map((x) => x.preco), [20, 22]);
});

test('sabão em pó sem a palavra "em" também vale', () => {
  assert.equal(filtrar([c('Sabão Pó Brilhante 1kg', 9)], item('Sabão em Pó')).length, 1);
  assert.equal(filtrar([c('Sabão Líquido 1kg', 9)], item('Sabão em Pó')).length, 0);
});

test('motivo do descarte explica o porquê', () => {
  const arroz = item('Arroz Branco');
  assert.equal(motivoDescarte(c('Arroz Branco Camil 5kg', 20), arroz), null);
  assert.equal(motivoDescarte(c('Arroz Branco Camil 1kg', 5), arroz), 'tamanho diferente');
  assert.match(motivoDescarte(c('Arroz Integral 5kg', 15), arroz), /palavra proibida/);
  assert.equal(motivoDescarte(c('Feijão Preto 5kg', 15), arroz), 'não é o item');
});

test('maiúsculas e minúsculas não fazem diferença', () => {
  const arroz = item('Arroz Branco');
  assert.equal(motivoDescarte(c('ARROZ BRANCO CAMIL 5KG', 20), arroz), null);
  assert.equal(motivoDescarte(c('arroz branco camil 5kg', 20), arroz), null);
  assert.match(motivoDescarte(c('ARROZ INTEGRAL 5KG', 20), arroz), /palavra proibida/);
  assert.equal(filtrar([c('FEIJÃO PRETO TIPO 1 1KG', 7)], item('Feijão Preto')).length, 1);
  assert.equal(filtrar([c('leite INTEGRAL uht 1 LITRO', 5)], item('Leite Integral')).length, 1);
});

test('produto certo mas esgotado é explicado como "sem estoque"', () => {
  const esgotado = { nome: 'Arroz Branco Camil 5kg', preco: 20, semEstoque: true };
  assert.equal(motivoDescarte(esgotado, item('Arroz Branco')), 'sem estoque');
  assert.deepEqual(filtrar([esgotado], item('Arroz Branco')), []);
  // item errado esgotado continua sendo "não é o item"
  assert.equal(motivoDescarte({ nome: 'Feijão 1kg', preco: 5, semEstoque: true }, item('Arroz Branco')), 'não é o item');
});
