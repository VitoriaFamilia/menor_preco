// Utilitários de localização: distância (Haversine) e conversão de CEP em coordenadas.

const RAIO_TERRA_KM = 6371;

function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(a));
}

// Devolve os 8 dígitos do CEP ou null se for inválido.
function normalizarCep(cep) {
  const digitos = String(cep ?? '').replace(/\D/g, '');
  return digitos.length === 8 ? digitos : null;
}

async function buscarJson(url, opcoes = {}) {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 6000);
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controle.signal });
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    return null;
  } finally {
    clearTimeout(limite);
  }
}

function coordenadasValidas(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

// Converte um CEP em { latitude, longitude }. Retorna null se não conseguir.
// 1) AwesomeAPI já devolve lat/lng.  2) Plano B: ViaCEP (endereço) + Nominatim (coordenadas).
async function cepParaCoordenadas(cepBruto) {
  const cep = normalizarCep(cepBruto);
  if (!cep) return null;

  const awesome = await buscarJson(`https://cep.awesomeapi.com.br/json/${cep}`);
  if (awesome && awesome.lat && awesome.lng) {
    const latitude = Number(awesome.lat);
    const longitude = Number(awesome.lng);
    if (coordenadasValidas(latitude, longitude)) return { latitude, longitude };
  }

  const via = await buscarJson(`https://viacep.com.br/ws/${cep}/json/`);
  if (!via || via.erro) return null;

  const consultas = [
    [via.logradouro, via.bairro, via.localidade, via.uf],
    [via.bairro, via.localidade, via.uf],
  ].map((partes) => partes.filter(Boolean).join(', '));

  for (const consulta of consultas) {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' +
      encodeURIComponent(consulta);
    const achados = await buscarJson(url, {
      headers: { 'User-Agent': 'SuperPreco-ProjetoFinal/1.0 (FAETEC)' },
    });
    if (Array.isArray(achados) && achados.length) {
      const latitude = Number(achados[0].lat);
      const longitude = Number(achados[0].lon);
      if (coordenadasValidas(latitude, longitude)) return { latitude, longitude };
    }
  }
  return null;
}

module.exports = { haversineKm, normalizarCep, cepParaCoordenadas, coordenadasValidas };
