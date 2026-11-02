// Os 18 itens genéricos do SuperPreço (a marca NÃO importa: vale o menor preço).
//   nome    -> IGUAL ao nome na tabela produtos
//   termo   -> o que o coletor digita na busca do site
//   extras  -> outras buscas, para achar mais produtos (opcional)
//   tamanho -> tamanho de referência (IGUAL ao peso_medida): só vale produto exatamente desse tamanho
//   deve    -> palavras que TODAS precisam estar no nome (sem acento, minúsculas)
//   evita   -> se QUALQUER uma aparecer, o produto é descartado
// Ajustar um termo ou uma palavra aqui já muda o resultado, sem mexer em mais nada.

module.exports = [
  { nome: 'Arroz Branco', termo: 'arroz branco', tamanho: '5kg',
    extras: ['arroz 5kg', 'arroz agulhinha tipo 1'],
    deve: ['arroz'],
    evita: ['integral', 'parboiliz\\w*', 'arborio', 'negro', 'vermelho', 'cateto', 'japones', 'risoto', 'cozido', 'instantaneo'] },

  { nome: 'Feijão Preto', termo: 'feijao preto', tamanho: '1kg',
    extras: ['feijao 1kg'],
    deve: ['feijao', 'preto'],
    evita: ['pronto', 'molho', 'caldo', 'feijoada'] },

  { nome: 'Açúcar Refinado', termo: 'acucar refinado', tamanho: '1kg',
    extras: ['acucar 1kg'],
    deve: ['acucar', 'refinado'],
    evita: ['mascavo', 'demerara', 'organico', 'light', 'adocante', 'confeiteiro', 'impalpavel'] },

  { nome: 'Óleo de Soja', termo: 'oleo de soja', tamanho: '900ml',
    deve: ['oleo', 'soja'],
    evita: ['spray'] },

  { nome: 'Café Torrado', termo: 'cafe torrado', tamanho: '500g',
    extras: ['cafe 500g', 'cafe torrado e moido'],
    deve: ['cafe'],
    evita: ['soluvel', 'capsulas?', 'descafeinado', 'cappuccino', 'instantaneo', 'gelado', 'pronto'] },

  { nome: 'Leite Integral', termo: 'leite integral', tamanho: '1L',
    extras: ['leite uht integral 1 litro'],
    deve: ['leite', 'integral'],
    evita: ['condensado', 'coco', 'po', 'achocolatado', 'zero lactose', 'sem lactose', 'desnatado', 'semidesnatado', 'fermentado', 'creme', 'cabra', 'aveia', 'amendoa', 'soja'] },

  { nome: 'Macarrão Espaguete', termo: 'macarrao espaguete', tamanho: '500g',
    extras: ['espaguete 500g'],
    deve: ['espaguete|spaghetti'],
    evita: ['integral', 'gluten', 'instantaneo', 'lamen', 'miojo'] },

  { nome: 'Farinha de Trigo', termo: 'farinha de trigo', tamanho: '1kg',
    deve: ['farinha', 'trigo'],
    evita: ['integral', 'mandioca', 'rosca', 'fermento', 'pizza'] },

  { nome: 'Sal Refinado', termo: 'sal refinado', tamanho: '1kg',
    extras: ['sal 1kg'],
    deve: ['sal', 'refinado'],
    evita: ['grosso', 'rosa', 'himalaia', 'light', 'marinho', 'churrasco'] },

  { nome: 'Biscoito Cream Cracker', termo: 'biscoito cream cracker', tamanho: '400g',
    extras: ['cream cracker'],
    deve: ['cream cracker'],
    evita: ['integral', 'recheado'] },

  { nome: 'Margarina', termo: 'margarina', tamanho: '500g',
    deve: ['margarina'],
    evita: ['light', 'culinaria', 'folhada', 'vegana'] },

  { nome: 'Ovos', termo: 'ovos', tamanho: '12 un',
    extras: ['ovos 12 unidades', 'ovos brancos', 'ovos vermelhos'],
    deve: ['ovos?'],
    evita: ['codorna', 'pascoa', 'chocolate', 'colorido', 'organicos?', 'caipira', 'omega'] },

  { nome: 'Extrato de Tomate', termo: 'extrato de tomate', tamanho: '340g',
    deve: ['extrato', 'tomate'],
    evita: ['organico'] },

  { nome: 'Detergente Líquido', termo: 'detergente liquido', tamanho: '500ml',
    extras: ['detergente 500ml', 'detergente lava loucas'],
    deve: ['detergente'],
    evita: ['maquina', 'pastilha', 'capsulas?', 'po', 'roupas?', 'concentrado'] },

  { nome: 'Sabão em Pó', termo: 'sabao em po', tamanho: '1kg',
    extras: ['sabao po 1kg', 'lava roupas po 1kg'],
    deve: ['sabao', 'po'],
    evita: ['liquido', 'barra', 'refil', 'porta'] },

  { nome: 'Água Sanitária', termo: 'agua sanitaria', tamanho: '1L',
    extras: ['agua sanitaria 1 litro'],
    deve: ['agua', 'sanitaria'],
    evita: ['gel'] },

  { nome: 'Papel Higiênico', termo: 'papel higienico', tamanho: '12 rolos',
    extras: ['papel higienico folha dupla 12'],
    deve: ['papel', 'higienico'],
    evita: ['umedecido', 'molhado', 'toalha'] },

  { nome: 'Sabonete', termo: 'sabonete', tamanho: '85g',
    extras: ['sabonete barra 85g'],
    deve: ['sabonete'],
    evita: ['liquido', 'refil', 'intimo', 'facial', 'esfoliante'] },
];
