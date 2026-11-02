// Sonda o site de uma rede e mostra o que ele devolve, SEM gravar nada.
// Serve para descobrir por que uma rede volta vazia (bloqueio, região, canal de vendas, estoque).
//
//   node coletor/sondar.js atacadao                 -> busca "arroz"
//   node coletor/sondar.js atacadao "feijao preto"  -> busca outro termo
//   node coletor/sondar.js atacadao arroz --extra=sc=2   -> com parâmetros extras

const { extrairCandidatos } = require('./redes/vtex');

const REDES = {
  prezunic: require('./redes/prezunic'),
  atacadao: require('./redes/atacadao'),
};

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const pos = args.filter((a) => !a.startsWith('--'));
const chave = pos[0];
const termo = pos[1] || 'arroz';
const extraFlag = flags.find((f) => f.startsWith('--extra='));
const rede = REDES[chave];

if (!rede) {
  console.log(`Uso: node coletor/sondar.js <rede> [termo] [--extra=sc=2]\nRedes: ${Object.keys(REDES).join(', ')}`);
  process.exit(1);
}

const extra = extraFlag ? extraFlag.slice('--extra='.length) : rede.consultaExtra;
const url = `${rede.baseUrl}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(termo)}&_from=0&_to=49${extra ? `&${extra}` : ''}`;

(async () => {
  console.log(`Rede: ${rede.nomeRede}\nURL:  ${url}\n`);
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
  } catch (e) {
    console.log(`✘ Não consegui conectar: ${e.message}`);
    console.log('  Verifique a internet. Se funciona no navegador, o site pode estar bloqueando o robô.');
    process.exit(1);
  }

  console.log(`HTTP ${res.status} ${res.statusText}`);
  console.log(`Conteúdo: ${res.headers.get('content-type')}`);
  console.log(`Intervalo (resources): ${res.headers.get('resources') || '(não informado)'}`);

  const texto = await res.text();
  let produtos;
  try { produtos = JSON.parse(texto); } catch {
    console.log('\n✘ A resposta não é JSON. Começo da resposta:');
    console.log(texto.slice(0, 300).replace(/\s+/g, ' '));
    console.log('  Provável bloqueio do site (página de verificação) ou endereço diferente.');
    process.exit(1);
  }
  if (!Array.isArray(produtos)) {
    console.log('\n✘ O JSON não é uma lista de produtos:', JSON.stringify(produtos).slice(0, 300));
    process.exit(1);
  }

  const cands = extrairCandidatos(produtos);
  const comEstoque = cands.filter((c) => !c.semEstoque);
  console.log(`\nProdutos devolvidos: ${produtos.length}`);
  console.log(`SKUs com preço: ${cands.length} (com estoque: ${comEstoque.length}, esgotados: ${cands.length - comEstoque.length})`);

  const mostrar = (cands.length ? cands : []).slice(0, 8);
  mostrar.forEach((c) => console.log(`  · R$ ${c.preco.toFixed(2).replace('.', ',')}  ${c.semEstoque ? '[ESGOTADO] ' : ''}${c.nome}`));

  if (produtos.length === 0) {
    console.log('\n✘ Nenhum produto. O endereço pode estar errado, ou o site só mostra produtos para uma loja/região.');
    console.log('  Tente: node coletor/sondar.js ' + chave + ' ' + termo + ' --extra=sc=2   (troque o número do canal)');
  } else if (cands.length === 0) {
    console.log('\n⚠ Há produtos, mas sem preço/estoque. Isso costuma indicar que falta escolher loja, região ou canal de vendas.');
    console.log('  Abra o site, escolha uma loja e veja nos parâmetros da URL ou da rede (F12 > Network) um "sc=" ou "regionId=".');
  } else {
    console.log('\n✔ O site respondeu com preços. Pode rodar: node coletor/coletar.js ' + chave);
  }
})();
