import type { SectorIdType } from 'shared-types';
import rawMap from './data/sectorMap.json';

// ─── Scrip code → sector lookup ───────────────────────────────────────────────
// Built from sectorMap.json at module load time (inverted index)
const scripToSector: Record<string, SectorIdType> = {};

const SECTORS = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'] as const;

for (const sector of SECTORS) {
  const codes = (rawMap as unknown as Record<string, string[]>)[sector] ?? [];
  for (const code of codes) {
    // First sector wins on any duplicate scrip codes
    if (!scripToSector[code]) {
      scripToSector[code] = sector as SectorIdType;
    }
  }
}

// ─── Name → sector keyword dictionary ────────────────────────────────────────
const NAME_KEYWORDS: Array<{ keywords: string[]; sector: SectorIdType }> = [
  {
    keywords: [
      'infosys', 'tcs', 'tata consultancy', 'wipro', 'hcl tech', 'hcltech',
      'tech mahindra', 'mphasis', 'ltimindtree', 'l&t infotech', 'coforge',
      'persistent', 'hexaware', 'zensar', 'oracle financial', 'ofss',
      'kpit tech', 'cyient', 'birlasoft', 'mastek'
    ],
    sector: 'IT'
  },
  {
    keywords: [
      'hdfc bank', 'icici bank', 'sbi', 'state bank', 'kotak', 'axis bank',
      'indusind', 'yes bank', 'federal bank', 'bandhan', 'idfc first',
      'punjab national', 'pnb', 'bank of baroda', 'canara bank', 'union bank',
      'indian bank', 'central bank', 'uco bank', 'rbl bank', 'au small finance',
      'equitas', 'ujjivan', 'city union', 'karnataka bank', 'south indian bank',
      'bajaj finance', 'bajaj finserv', 'shriram finance', 'muthoot', 'manappuram',
      'cholamandalam', 'l&t finance', 'piramal finance', 'hdfc life', 'sbi life',
      'icici prudential', 'max financial', 'star health'
    ],
    sector: 'BANKING'
  },
  {
    keywords: [
      'sun pharma', 'sun pharmaceutical', 'dr reddy', 'cipla', 'divi',
      'lupin', 'aurobindo', 'biocon', 'alkem', 'ipca', 'torrent pharma',
      'abbott india', 'pfizer', 'glaxo', 'sanofi', 'zydus', 'cadila',
      'glenmark', 'natco', 'strides', 'laurus', 'granules', 'aarti drugs',
      'suven pharma', 'sequent scientific', 'solara'
    ],
    sector: 'PHARMA'
  },
  {
    keywords: [
      'maruti', 'tata motors', 'mahindra', 'm&m', 'hero motocorp', 'bajaj auto',
      'tvs motor', 'eicher motors', 'ashok leyland', 'force motors',
      'escorts kubota', 'sml isuzu', 'motherson', 'minda', 'bosch',
      'exide', 'amara raja', 'apollo tyres', 'ceat', 'mrf'
    ],
    sector: 'AUTO'
  },
  {
    keywords: [
      'hindustan unilever', 'hul', 'itc', 'nestle', 'britannia', 'dabur',
      'marico', 'godrej consumer', 'emami', 'colgate', 'p&g', 'procter',
      'tata consumer', 'varun beverages', 'united spirits', 'radico',
      'avanti feeds', 'venky', 'heritage foods', 'kwality'
    ],
    sector: 'FMCG'
  },
  {
    keywords: [
      'reliance', 'ongc', 'oil & natural gas', 'ntpc', 'power grid',
      'adani green', 'adani power', 'adani energy', 'tata power',
      'torrent power', 'cesc', 'jsw energy', 'nhpc', 'sjvn', 'coal india',
      'indian oil', 'ioc', 'bpcl', 'hpcl', 'gail', 'petronet', 'mrpl',
      'oil india', 'gujarat gas', 'indraprastha gas', 'mahanagar gas'
    ],
    sector: 'ENERGY'
  },
  {
    keywords: [
      'tata steel', 'jsw steel', 'steel authority', 'sail', 'hindalco',
      'vedanta', 'hindustan zinc', 'national aluminium', 'nalco', 'nmdc',
      'coal india', 'hindustan copper', 'moil', 'welspun', 'ratnamani',
      'jindal steel', 'jindal stainless', 'jai balaji', 'lloyds metals',
      'graphite india', 'heg', 'mishra dhatu'
    ],
    sector: 'METALS'
  }
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function mapScripToSector(scripCode: string): SectorIdType | null {
  return scripToSector[scripCode.trim()] ?? null;
}

export function mapNameToSector(name: string): SectorIdType | null {
  const lower = name.toLowerCase().trim();
  for (const { keywords, sector } of NAME_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) {
      return sector;
    }
  }
  return null;
}

export function mapCompany(scripCode: string, name: string): SectorIdType | null {
  return mapScripToSector(scripCode) ?? mapNameToSector(name);
}

export function aggregateBlockDealsBySector(
  deals: Array<{ scrip_code: string; company: string; type: string; value_cr: number }>
): Record<SectorIdType, { buy_cr: number; sell_cr: number; net_cr: number }> {
  const result = {} as Record<SectorIdType, { buy_cr: number; sell_cr: number; net_cr: number }>;

  for (const sector of SECTORS) {
    result[sector] = { buy_cr: 0, sell_cr: 0, net_cr: 0 };
  }

  for (const deal of deals) {
    const sector = mapCompany(deal.scrip_code, deal.company);
    if (!sector) continue;

    if (deal.type === 'buy') {
      result[sector].buy_cr += deal.value_cr;
    } else {
      result[sector].sell_cr += deal.value_cr;
    }
  }

  for (const sector of SECTORS) {
    result[sector].net_cr = result[sector].buy_cr - result[sector].sell_cr;
  }

  return result;
}
