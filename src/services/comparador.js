// Regra de negócio da comparação (função pura: não acessa banco nem internet).
//
// Entrada:
//   itens    [{ id_produto, quantidade }]
//   produtos [{ id_produto, nome, peso_medida }]
//   filiais  [{ nome_rede, unidade_filial, endereco, latitude, longitude, distancia_km }]
//            já ORDENADAS da mais perto para a mais longe (ORDER BY distancia ASC na SQL)
//   precos   [{ nome_rede, id_produto, preco }]  (um preço por rede e produto)
//   origem   { latitude, longitude } do cliente
//
// Saída: os dois cards (mais próximo e mais barato) e um resumo comparando os dois.

const emCentavos = (valor) => Math.round(Number(valor) * 100);
const emReais = (centavos) => centavos / 100;
const dinheiro = (reais) => 'R$ ' + reais.toFixed(2).replace('.', ',');
const umaCasa = (km) => Math.round(km * 10) / 10;

const LIMITE_AVISO_KM = 80;

const TITULOS = {
  mais_proximo: 'Mais próximo',
  mais_barato: 'Mais barato',
  segundo_mais_barato: 'Segunda opção mais barata',
};

function linkMaps(origem, filial) {
  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${origem.latitude},${origem.longitude}` +
    `&destination=${filial.latitude},${filial.longitude}` +
    '&travelmode=driving'
  );
}

function montarCard(candidata, tipo, origem) {
  const { filial } = candidata;
  return {
    tipo,
    titulo: TITULOS[tipo],
    rede: candidata.rede,
    filial: filial.unidade_filial,
    endereco: filial.endereco,
    latitude: filial.latitude,
    longitude: filial.longitude,
    distancia_km: umaCasa(candidata.distancia),
    total: emReais(candidata.totalCent),
    maps_url: linkMaps(origem, filial),
    itens: candidata.itens,
  };
}

function montarComparacao({ itens, produtos, filiais, precos, origem }) {
  const produtoPorId = new Map(produtos.map((p) => [p.id_produto, p]));

  // rede -> (id_produto -> preço em centavos)
  const precoDaRede = new Map();
  for (const p of precos) {
    if (!precoDaRede.has(p.nome_rede)) precoDaRede.set(p.nome_rede, new Map());
    precoDaRede.get(p.nome_rede).set(p.id_produto, emCentavos(p.preco));
  }

  // Filial mais próxima de cada rede (a lista já vem ordenada por distância).
  const maisPertoPorRede = new Map();
  for (const f of filiais) {
    if (!maisPertoPorRede.has(f.nome_rede)) maisPertoPorRede.set(f.nome_rede, f);
  }

  // Só entra na comparação a rede que tem preço para TODOS os itens escolhidos.
  const candidatas = [];
  const redesSemPrecos = [];
  for (const [rede, filial] of maisPertoPorRede) {
    const tabela = precoDaRede.get(rede);
    if (!tabela || itens.some((i) => !tabela.has(i.id_produto))) {
      redesSemPrecos.push(rede);
      continue;
    }
    let totalCent = 0;
    const detalhe = itens.map((i) => {
      const unitario = tabela.get(i.id_produto);
      const subtotal = unitario * i.quantidade;
      totalCent += subtotal;
      const prod = produtoPorId.get(i.id_produto);
      return {
        id_produto: i.id_produto,
        nome: prod.nome,
        peso_medida: prod.peso_medida,
        quantidade: i.quantidade,
        preco_unitario: emReais(unitario),
        subtotal: emReais(subtotal),
      };
    });
    candidatas.push({ rede, filial, distancia: filial.distancia_km, totalCent, itens: detalhe });
  }

  if (candidatas.length === 0) {
    return { cards: [], comparacao: null, aviso: null, redes_sem_precos: redesSemPrecos };
  }

  const porDistancia = [...candidatas].sort(
    (a, b) => a.distancia - b.distancia || a.totalCent - b.totalCent
  );
  const porPreco = [...candidatas].sort(
    (a, b) => a.totalCent - b.totalCent || a.distancia - b.distancia
  );
  const proxima = porDistancia[0];
  const barata = porPreco[0];

  const primeiro = montarCard(proxima, 'mais_proximo', origem);
  primeiro.tambem_mais_barato = proxima.rede === barata.rede;
  const cards = [primeiro];

  // Os dois cards nunca repetem a mesma rede.
  let segunda = null;
  if (barata.rede !== proxima.rede) {
    segunda = { candidata: barata, tipo: 'mais_barato' };
  } else {
    const outra = porPreco.find((c) => c.rede !== proxima.rede);
    if (outra) segunda = { candidata: outra, tipo: 'segundo_mais_barato' };
  }

  let comparacao = null;
  if (segunda) {
    const card2 = montarCard(segunda.candidata, segunda.tipo, origem);
    cards.push(card2);

    const diferencaCent = segunda.candidata.totalCent - proxima.totalCent;
    const diferencaKm = umaCasa(segunda.candidata.distancia - proxima.distancia);
    const valor = dinheiro(emReais(Math.abs(diferencaCent)));
    const dist = Math.abs(diferencaKm);
    const textoKm = dist === 0 ? 'à mesma distância' : `${dist} km mais ${diferencaKm > 0 ? 'longe' : 'perto'}`;

    let resumo;
    if (segunda.tipo === 'mais_barato') {
      resumo = `${card2.rede} é ${valor} mais barato que ${primeiro.rede}, mas fica ${textoKm}.`;
    } else {
      resumo =
        `${primeiro.rede} é o mais próximo e também o mais barato. ` +
        `A segunda opção, ${card2.rede}, custa ${valor} a mais e fica ${textoKm}.`;
    }
    comparacao = {
      diferenca_total: emReais(diferencaCent), // segundo card menos primeiro card
      diferenca_km: diferencaKm,
      resumo,
    };
  }

  const aviso =
    proxima.distancia > LIMITE_AVISO_KM
      ? `A filial mais próxima fica a ${umaCasa(proxima.distancia)} km. ` +
        'Sua localização parece estar fora da região do Rio de Janeiro.'
      : null;

  return { cards, comparacao, aviso, redes_sem_precos: redesSemPrecos };
}

module.exports = { montarComparacao };
