// Regras para escolher, entre tudo que o site devolve, o produto certo de cada item genérico.
// A MARCA NÃO É USADA EM LUGAR NENHUM: vale o menor preço entre todas as marcas.
// Tudo é comparado sem acento e em minúsculas.

const semAcento = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const UNIDADE = '(kgs?|quilos?|gramas?|grs?|g|ml|litros?|lts?|l|unidades?|unid|und|un|rolos?|ovos?|duzias?)';
const NUM = '(\\d+(?:\\.\\d+)?)';

function classificar(u) {
  if (/^(kgs?|quilos?)$/.test(u)) return ['massa', 1000];
  if (/^(g|gramas?|grs?)$/.test(u)) return ['massa', 1];
  if (/^ml$/.test(u)) return ['volume', 1];
  if (/^(l|lts?|litros?)$/.test(u)) return ['volume', 1000];
  if (/^duzias?$/.test(u)) return ['unidade', 12];
  return ['unidade', 1]; // un, und, unid, unidades, rolos, ovos
}

// Lê os tamanhos citados no texto: massa em g, volume em ml, unidades.
// "pacote" > 1 indica kit/caixa (ex.: "c/12", "3x1L", "leve 6"): o preço é do conjunto.
function lerTamanhos(texto) {
  let t = semAcento(texto).replace(/(\d),(\d)/g, '$1.$2');
  const r = { massa: [], volume: [], unidade: [], pacote: 0 };

  // "3 x 1L", "3x500g"
  t = t.replace(new RegExp(`(\\d+)\\s*x\\s*${NUM}\\s*${UNIDADE}\\b`, 'g'), (_, n, v, u) => {
    const [tipo, f] = classificar(u);
    r.pacote = Math.max(r.pacote, Number(n));
    r[tipo].push(Number(v) * f * Number(n));
    return ' ';
  });

  // "c/12", "com 12", "leve 6", "cx 12", "pack 4", "kit 3"
  t = t.replace(/\b(?:c\/|com|leve|cx|caixa|pack|kit|fardo)\s*(\d+)\b(?!\s*(?:kg|g|ml|l)\b)/g, (_, n) => {
    r.pacote = Math.max(r.pacote, Number(n));
    r.unidade.push(Number(n));
    return ' ';
  });

  // "5kg", "900 ml", "12 unidades", "12 rolos", "12 ovos", "1 duzia"
  const re = new RegExp(`${NUM}\\s*${UNIDADE}\\b`, 'g');
  let m;
  while ((m = re.exec(t)) !== null) {
    const [tipo, f] = classificar(m[2]);
    r[tipo].push(Number(m[1]) * f);
  }
  return r;
}

const igual = (a, b) => Math.abs(a - b) < 0.01;

// ref: "5kg", "900ml", "1L", "12 un", "12 rolos"
function tamanhoDeReferencia(ref) {
  const t = lerTamanhos(ref);
  for (const tipo of ['massa', 'volume', 'unidade']) {
    if (t[tipo].length) return { tipo, valor: t[tipo][0] };
  }
  throw new Error(`Tamanho de referência inválido: ${ref}`);
}

// O texto tem exatamente o tamanho de referência (e não é kit/caixa)?
function temTamanho(texto, ref) {
  const alvo = tamanhoDeReferencia(ref);
  const t = lerTamanhos(texto);
  if (alvo.tipo === 'unidade') {
    // ovos, papel higiênico: o número de unidades é o próprio tamanho
    return t.unidade.some((v) => igual(v, alvo.valor));
  }
  // massa/volume: kit, caixa ou várias unidades = preço de conjunto -> descarta
  if (t.pacote > 1 || t.unidade.some((v) => v > 1)) return false;
  return t[alvo.tipo].some((v) => igual(v, alvo.valor));
}

const palavra = (p) => new RegExp(`\\b(?:${p})\\b`);

// Por que este produto NÃO serve para o item? (null = serve)
function motivoDescarte(c, item) {
  const nome = semAcento(c.nome); // sem acento e em minúsculas: "LEITE Integral" = "leite integral"
  if (!(item.deve || []).every((p) => palavra(p).test(nome))) return 'não é o item';
  const proibida = (item.evita || []).find((p) => palavra(p).test(nome));
  if (proibida) return `palavra proibida (${proibida})`;
  if (!temTamanho(c.nome, item.tamanho)) return 'tamanho diferente';
  // É o item certo, no tamanho certo: só não serve se estiver esgotado ou sem preço.
  if (c.semEstoque) return 'sem estoque';
  if (!Number.isFinite(c.preco) || c.preco <= 0) return 'sem preço';
  return null;
}

// Candidatos válidos do item, do mais barato ao mais caro (qualquer marca).
function filtrar(candidatos, item) {
  return candidatos
    .filter((c) => motivoDescarte(c, item) === null)
    .sort((a, b) => a.preco - b.preco);
}

module.exports = { semAcento, lerTamanhos, temTamanho, motivoDescarte, filtrar };
