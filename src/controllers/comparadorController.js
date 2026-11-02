const Modelo = require('../models/comparadorModel');
const { montarComparacao } = require('../services/comparador');
const { cepParaCoordenadas, normalizarCep, coordenadasValidas } = require('../services/geo');

function numeroOuNulo(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

// GET /api/produtos
exports.listarProdutos = async (req, res) => {
  try {
    res.json(await Modelo.listarProdutos());
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

// POST /api/localizacao/cep   { cep }
exports.consultarCep = async (req, res) => {
  try {
    const cep = normalizarCep(req.body?.cep);
    if (!cep) return res.status(400).json({ erro: 'CEP inválido. Digite os 8 números.' });
    const coordenadas = await cepParaCoordenadas(cep);
    if (!coordenadas) return res.status(404).json({ erro: 'CEP não encontrado' });
    res.json({ cep, ...coordenadas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

// POST /api/comparar
//   { itens: [{ id_produto, quantidade }], latitude, longitude }   (GPS)
//   { itens: [...], cep: "20541-000" }                             (CEP digitado)
exports.comparar = async (req, res) => {
  try {
    const corpo = req.body || {};
    if (!Array.isArray(corpo.itens)) return res.status(400).json({ erro: 'Envie a lista de itens' });

    // Só vale item com quantidade inteira maior que zero; repetidos são somados.
    const escolhidos = new Map();
    for (const item of corpo.itens) {
      const id = Number(item?.id_produto);
      const quantidade = Number(item?.quantidade);
      if (Number.isInteger(id) && Number.isInteger(quantidade) && quantidade > 0) {
        escolhidos.set(id, (escolhidos.get(id) || 0) + quantidade);
      }
    }
    if (escolhidos.size === 0) {
      return res.status(400).json({ erro: 'Selecione ao menos um produto' });
    }

    // Localização é obrigatória: GPS (latitude/longitude) ou CEP.
    let latitude = numeroOuNulo(corpo.latitude);
    let longitude = numeroOuNulo(corpo.longitude);
    if (latitude === null || longitude === null) {
      if (!corpo.cep) {
        return res.status(400).json({ erro: 'Informe o CEP ou ative a localização' });
      }
      if (!normalizarCep(corpo.cep)) {
        return res.status(400).json({ erro: 'CEP inválido. Digite os 8 números.' });
      }
      const coordenadas = await cepParaCoordenadas(corpo.cep);
      if (!coordenadas) return res.status(404).json({ erro: 'CEP não encontrado' });
      ({ latitude, longitude } = coordenadas);
    }
    if (!coordenadasValidas(latitude, longitude)) {
      return res.status(400).json({ erro: 'Localização inválida' });
    }

    const ids = [...escolhidos.keys()];
    const produtos = await Modelo.produtosPorIds(ids);
    if (produtos.length !== ids.length) {
      return res.status(400).json({ erro: 'Há produto inexistente na lista' });
    }

    const [filiais, precos] = await Promise.all([
      Modelo.filiaisPorDistancia(latitude, longitude),
      Modelo.precosPorRede(ids),
    ]);

    const itens = ids.map((id) => ({ id_produto: id, quantidade: escolhidos.get(id) }));
    const origem = { latitude, longitude };
    const resultado = montarComparacao({ itens, produtos, filiais, precos, origem });

    if (resultado.cards.length === 0) {
      return res.json({
        origem,
        ...resultado,
        mensagem: 'Ainda não há preços cadastrados para todos os itens escolhidos.',
      });
    }
    res.json({ origem, ...resultado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};
