const db = require('../config/db');

const ComparadorModel = {
  async listarProdutos() {
    const [linhas] = await db.query(
      'SELECT id_produto, nome, peso_medida FROM produtos ORDER BY id_produto'
    );
    return linhas;
  },

  async produtosPorIds(ids) {
    const [linhas] = await db.query(
      'SELECT id_produto, nome, peso_medida FROM produtos WHERE id_produto IN (?)',
      [ids]
    );
    return linhas;
  },

  // Todas as filiais ativas, da mais perto para a mais longe do cliente.
  // Distância pela fórmula de Haversine (em km), calculada no próprio MySQL.
  async filiaisPorDistancia(latitude, longitude) {
    const [linhas] = await db.query(
      `SELECT id_mercado, nome_rede, unidade_filial, endereco, latitude, longitude,
              2 * 6371 * ASIN(SQRT(
                POWER(SIN(RADIANS(latitude - ?) / 2), 2) +
                COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                POWER(SIN(RADIANS(longitude - ?) / 2), 2)
              )) AS distancia_km
         FROM mercados
        WHERE ativo = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY distancia_km ASC`,
      [latitude, latitude, longitude]
    );
    // O MySQL devolve DECIMAL como texto: converte para número.
    return linhas.map((l) => ({
      ...l,
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
      distancia_km: Number(l.distancia_km),
    }));
  },

  // Preço de cada produto em cada REDE: o menor valor registrado para a rede.
  // Assim basta gravar o preço em uma filial da rede (o robô faz isso).
  async precosPorRede(idsProdutos) {
    const [linhas] = await db.query(
      `SELECT m.nome_rede, p.id_produto, MIN(p.preco) AS preco
         FROM precos p
         JOIN mercados m ON m.id_mercado = p.id_mercado
        WHERE p.id_produto IN (?)
        GROUP BY m.nome_rede, p.id_produto`,
      [idsProdutos]
    );
    return linhas.map((l) => ({
      nome_rede: l.nome_rede,
      id_produto: l.id_produto,
      preco: Number(l.preco),
    }));
  },
};

module.exports = ComparadorModel;
