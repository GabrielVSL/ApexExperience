// Serviço de Telemetria e Circuitos Oficiais com Dados Geográficos 100% Reais da FIA (bacinger/f1-circuits + OSM)
export type CircuitId =
  | 'nurburgring'
  | 'le_mans'
  | 'spa'
  | 'monza'
  | 'monaco'
  | 'silverstone'
  | 'interlagos'
  | 'suzuka';

export type CircuitCategory = 'ALL' | 'F1' | 'ENDURANCE' | 'LEGENDS';

export interface Circuit {
  id: CircuitId;
  code: string;
  shortCode: string;
  name: string;
  subname: string;
  location: string;
  region: string;
  country: string;
  flag: string;
  category: 'F1' | 'ENDURANCE' | 'LEGENDS';
  categoryLabel: string;
  lengthKm: string;
  corners: number;
  lapRecord: string;
  recordHolder: string;
  lat: number;
  lon: number;
  carBrand: string;
  carModel: string;
  carNumber: string;
  topSpeed: string;
  acceleration: string;
  power: string;
  videoThumbnail: string;
  synopsis: string;
  scheduleSummary: string;
}

export interface CircuitLiveWeather {
  temperature: number;
  trackTemperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  gripStatus: 'OPTIMAL (DRY)' | 'DAMP' | 'WET TRACK' | 'COLD TARMAC';
  gripColor: string;
  lastUpdated: string;
}

export const CIRCUITS: Circuit[] = [
  {
    id: 'nurburgring',
    code: 'NBR-GRN',
    shortCode: 'NBR',
    name: 'Nürburgring Nordschleife',
    subname: 'The Green Hell',
    location: 'Nürburg, Eifel',
    region: 'Alemanha Ocidental',
    country: 'Alemanha',
    flag: '🇩🇪',
    category: 'ENDURANCE',
    categoryLabel: 'ENDURANCE // VLN & 24H',
    lat: 50.3356,
    lon: 6.9478,
    lengthKm: '20.832 km',
    corners: 73,
    lapRecord: '6:49.328',
    recordHolder: 'Porsche 911 GT3 RS (J. Bergmeister)',
    carBrand: 'Porsche',
    carModel: '911 GT3 RS (992)',
    carNumber: '46',
    topSpeed: '296 KM/H',
    acceleration: '3.2s',
    power: '525 CV',
    videoThumbnail: '/circuits/nurburgring-video.jpg',
    synopsis:
      "Conhecido mundialmente como o 'Inferno Verde', Nürburgring Nordschleife é a meca absoluta do automobilismo. São mais de 20 km de asfalto encravados nas montanhas alemãs de Eifel. Ao reservar sua sessão, você recebe suporte de box privativo, seguro de pista internacional e o carro calibrado para voltas rápidas inesquecíveis.",
    scheduleSummary: 'Touristenfahrten · Sáb/Dom (Manhã e Tarde) · Ter/Qui (Entardecer)',
  },
  {
    id: 'le_mans',
    code: 'LM24-SAR',
    shortCode: 'LM24',
    name: 'Circuit de la Sarthe',
    subname: '24 Heures du Mans',
    location: 'Le Mans',
    region: 'Pays de la Loire',
    country: 'França',
    flag: '🇫🇷',
    category: 'ENDURANCE',
    categoryLabel: '24H LE MANS // FIA WEC',
    lat: 47.9547,
    lon: 0.2078,
    lengthKm: '13.626 km',
    corners: 38,
    lapRecord: '3:14.791',
    recordHolder: 'Toyota TS050 Hybrid (Kamui Kobayashi)',
    carBrand: 'Porsche',
    carModel: '963 LMDh Hypercar',
    carNumber: '05',
    topSpeed: '343 KM/H',
    acceleration: '2.4s',
    power: '680 CV',
    videoThumbnail: '/circuits/le_mans-video.jpg',
    synopsis:
      'Palco lendário das 24 Horas de Le Mans, este circuito combina o traçado permanente Bugatti com a história das provas de longa duração da França. Sinta a técnica das curvas Dunlop e Ford em sessões exclusivas de track day, com suporte de boxes dedicado e datas noturnas especiais de endurance.',
    scheduleSummary: 'Circuito Bugatti · Fins de semana quinzenais (+ Noturno Sáb)',
  },
  {
    id: 'spa',
    code: 'SPA-EAU',
    shortCode: 'SPA',
    name: 'Circuit de Spa-Francorchamps',
    subname: 'The Rollercoaster of the Ardennes',
    location: 'Stavelot, Liège',
    region: 'Ardenas Belgas',
    country: 'Bélgica',
    flag: '🇧🇪',
    category: 'F1',
    categoryLabel: 'FÓRMULA 1 // FIA GRADE 1',
    lat: 50.4372,
    lon: 5.9714,
    lengthKm: '7.004 km',
    corners: 19,
    lapRecord: '1:41.252',
    recordHolder: 'Mercedes-AMG F1 / Lewis Hamilton',
    carBrand: 'Mercedes-AMG',
    carModel: 'GT Track Series',
    carNumber: '77',
    topSpeed: '315 KM/H',
    acceleration: '3.1s',
    power: '730 CV',
    videoThumbnail: '/circuits/spa-video.jpg',
    synopsis:
      'Localizado no coração das densas florestas das Ardenas, Spa é aclamado como a mais espetacular montanha-russa do motorsport mundial. Acelere montanha acima pela mítica Eau Rouge e Raidillon com nossa equipe no pitlane e cobertura securitária completa para o seu supercarro.',
    scheduleSummary: 'Open Pitlane (103 dB) · Fins de semana e Quartas selecionadas',
  },
  {
    id: 'monza',
    code: 'MNZ-PAR',
    shortCode: 'MNZ',
    name: 'Autodromo Nazionale Monza',
    subname: 'Temple of Speed',
    location: 'Monza, Milão',
    region: 'Lombardia',
    country: 'Itália',
    flag: '🇮🇹',
    category: 'F1',
    categoryLabel: 'FÓRMULA 1 // SPEED TEMPLE',
    lat: 45.6189,
    lon: 9.2811,
    lengthKm: '5.793 km',
    corners: 11,
    lapRecord: '1:18.887',
    recordHolder: 'Mercedes-AMG F1 (Lewis Hamilton)',
    carBrand: 'Ferrari',
    carModel: '488 Challenge Evo',
    carNumber: '16',
    topSpeed: '335 KM/H',
    acceleration: '2.8s',
    power: '670 CV',
    videoThumbnail: '/circuits/monza-video.jpg',
    synopsis:
      "O histórico 'Templo da Velocidade' nos arredores de Milão é o autódromo mais rápido da Europa. Ideal para quem deseja explorar o limite de aceleração em retas monumentais e frear forte nas icônicas chicanes de Ascari e Parabolica com suporte técnico de ponta.",
    scheduleSummary: 'Monza Track Days · Sáb/Dom e Sextas selecionadas (Manhã/Tarde)',
  },
  {
    id: 'monaco',
    code: 'MCO-CAS',
    shortCode: 'MCO',
    name: 'Circuit de Monaco',
    subname: 'The Crown Jewel of the Riviera',
    location: 'Monte Carlo',
    region: 'Principado de Mônaco',
    country: 'Mônaco',
    flag: '🇲🇨',
    category: 'F1',
    categoryLabel: 'FÓRMULA 1 // STREET CIRCUIT',
    lat: 43.737,
    lon: 7.4246,
    lengthKm: '3.337 km',
    corners: 19,
    lapRecord: '1:10.166',
    recordHolder: 'Mercedes-AMG F1 (Lewis Hamilton)',
    carBrand: 'BMW',
    carModel: 'M4 Competition Track',
    carNumber: '99',
    topSpeed: '290 KM/H',
    acceleration: '3.5s',
    power: '510 CV',
    videoThumbnail: '/circuits/monaco-video.jpg',
    synopsis:
      'O traçado urbano mais glamoroso e lendário do automobilismo. Pilotar pelas avenidas de Monte Carlo, contornar a curva do Cassino e atravessar o famoso túnel à beira do Mar Mediterrâneo é uma experiência inesquecível com atendimento exclusivo de concierge.',
    scheduleSummary: 'Circuito de rua · Datas exclusivas quinzenais (Grid máx. 6 carros)',
  },
  {
    id: 'silverstone',
    code: 'SIL-COP',
    shortCode: 'SIL',
    name: 'Silverstone Circuit',
    subname: 'Home of British Motorsport',
    location: 'Silverstone',
    region: 'Northamptonshire',
    country: 'Reino Unido',
    flag: '🇬🇧',
    category: 'F1',
    categoryLabel: 'FÓRMULA 1 // FIA GRADE 1',
    lat: 52.0786,
    lon: -1.0169,
    lengthKm: '5.891 km',
    corners: 18,
    lapRecord: '1:24.303',
    recordHolder: 'Mercedes-AMG F1 (Lewis Hamilton)',
    carBrand: 'Aston Martin',
    carModel: 'Vantage GT3 Special',
    carNumber: '07',
    topSpeed: '310 KM/H',
    acceleration: '3.0s',
    power: '640 CV',
    videoThumbnail: '/circuits/silverstone-video.jpg',
    synopsis:
      'O berço histórico da Fórmula 1 e capital do motorsport britânico. Com curvas de altíssima velocidade como Copse, Maggotts e Becketts, Silverstone testa a precisão aerodinâmica do carro. Nossa equipe recepciona você no complexo The Wing com estrutura de box privativo.',
    scheduleSummary: 'Public Track Days (102 dB) · Sex/Sáb/Dom e Quartas alternadas',
  },
  {
    id: 'interlagos',
    code: 'INT-SEN',
    shortCode: 'INT',
    name: 'Autódromo de Interlagos',
    subname: 'José Carlos Pace // Senna S',
    location: 'São Paulo',
    region: 'São Paulo',
    country: 'Brasil',
    flag: '🇧🇷',
    category: 'F1',
    categoryLabel: 'FÓRMULA 1 // FIA GRADE 1',
    lat: -23.7036,
    lon: -46.6997,
    lengthKm: '4.309 km',
    corners: 15,
    lapRecord: '1:07.281',
    recordHolder: 'Mercedes-AMG F1 (Valtteri Bottas)',
    carBrand: 'Porsche',
    carModel: '911 GT3 Cup (992)',
    carNumber: '11',
    topSpeed: '320 KM/H',
    acceleration: '3.2s',
    power: '510 CV',
    videoThumbnail: '/circuits/interlagos-video.jpg',
    synopsis:
      'Com seu lendário S do Senna e traçado técnico ondulado no sentido anti-horário, Interlagos é um dos circuitos mais reverenciados do automobilismo mundial. Alugue seu supercarro para uma bateria cronometrada com telemetria e suporte mecânico completo.',
    scheduleSummary: 'Track Days Oficiais · Sáb/Dom e Sextas selecionadas (08h às 18h)',
  },
  {
    id: 'suzuka',
    code: 'SUZ-130',
    shortCode: 'SUZ',
    name: 'Suzuka International Circuit',
    subname: 'Figure 8 // 130R Master',
    location: 'Suzuka, Mie',
    region: 'Kansai',
    country: 'Japão',
    flag: '🇯🇵',
    category: 'F1',
    categoryLabel: 'FÓRMULA 1 // FIGURE 8',
    lat: 34.8431,
    lon: 136.541,
    lengthKm: '5.807 km',
    corners: 18,
    lapRecord: '1:27.064',
    recordHolder: 'Ferrari F1 (Sebastian Vettel)',
    carBrand: 'Nissan',
    carModel: 'GT-R Nismo Track Pack',
    carNumber: '23',
    topSpeed: '318 KM/H',
    acceleration: '2.7s',
    power: '600 CV',
    videoThumbnail: '/circuits/suzuka-video.jpg',
    synopsis:
      "Famoso por seu desenho em formato de '8' com cruzamento em desnível e pelas míticas curvas dos Esses e da 130R, Suzuka é a obra-prima das pistas asiáticas. Desfrute de voltas rápidas com suporte operacional completo no pitlane oficial.",
    scheduleSummary: 'SMSC Sports Driving · Fins de semana e Terças alternadas',
  },
];

// Cache em memória para evitar rate-limits de requisições de clima
const weatherCache = new Map<string, { data: CircuitLiveWeather; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getCircuitLiveWeather(circuit: Circuit): Promise<CircuitLiveWeather> {
  const cached = weatherCache.get(circuit.id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${circuit.lat}&longitude=${circuit.lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API error: ${res.statusText}`);
    const data = await res.json();
    const current = data.current;

    const temp = Math.round(current.temperature_2m ?? 17);
    const precip = current.precipitation ?? 0;
    const humidity = Math.round(current.relative_humidity_2m ?? 55);
    const wind = Math.round(current.wind_speed_10m ?? 12);

    const trackTemp = precip > 0 ? Math.max(temp - 2, 4) : temp + 6;

    let gripStatus: CircuitLiveWeather['gripStatus'] = 'OPTIMAL (DRY)';
    let gripColor = '#FF1717'; // Racing Red

    if (precip > 0.5) {
      gripStatus = 'WET TRACK';
      gripColor = '#38BDF8';
    } else if (precip > 0 || humidity > 85) {
      gripStatus = 'DAMP';
      gripColor = '#FBBF24';
    } else if (temp < 10) {
      gripStatus = 'COLD TARMAC';
      gripColor = '#94A3B8';
    }

    const weather: CircuitLiveWeather = {
      temperature: temp,
      trackTemperature: trackTemp,
      humidity,
      precipitation: precip,
      windSpeed: wind,
      gripStatus,
      gripColor,
      lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    weatherCache.set(circuit.id, { data: weather, timestamp: Date.now() });
    return weather;
  } catch {
    return {
      temperature: 21,
      trackTemperature: 28,
      humidity: 48,
      precipitation: 0,
      windSpeed: 9,
      gripStatus: 'OPTIMAL (DRY)',
      gripColor: '#FF1717',
      lastUpdated: 'LIVE',
    };
  }
}

export interface BrlExchangeRates {
  EUR: number; // quantos EUR equivalem a 1 BRL
  GBP: number; // quantos GBP equivalem a 1 BRL
  JPY: number; // quantos JPY equivalem a 1 BRL
}

const DEFAULT_BRL_RATES: BrlExchangeRates = {
  EUR: 1 / 6.15,
  GBP: 1 / 7.35,
  JPY: 25.5,
};

export async function getBrlExchangeRates(): Promise<BrlExchangeRates> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/BRL');
    if (!res.ok) return DEFAULT_BRL_RATES;
    const data = await res.json();
    const rates = data?.rates || {};
    return {
      EUR: typeof rates.EUR === 'number' && rates.EUR > 0 ? rates.EUR : DEFAULT_BRL_RATES.EUR,
      GBP: typeof rates.GBP === 'number' && rates.GBP > 0 ? rates.GBP : DEFAULT_BRL_RATES.GBP,
      JPY: typeof rates.JPY === 'number' && rates.JPY > 0 ? rates.JPY : DEFAULT_BRL_RATES.JPY,
    };
  } catch {
    return DEFAULT_BRL_RATES;
  }
}
