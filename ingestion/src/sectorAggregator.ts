import { mapCompany, aggregateBlockDealsBySector } from '../../synthesis/src/sectorScoring/sectorMapper.js';
import type { SignalPayloadType, SectorIdType, SectorSignalBreakdownType } from 'shared-types';

// ─── NIFTY 50 sector weights (used to distribute aggregate FII/DII by sector) ─
const SECTOR_NIFTY_WEIGHTS: Record<SectorIdType, number> = {
  IT:      0.15,
  BANKING: 0.28,
  PHARMA:  0.06,
  AUTO:    0.08,
  FMCG:    0.10,
  ENERGY:  0.14,
  METALS:  0.05,
  // Remaining ~14% is infra/others — not tracked in Phase 1
};

const ALL_SECTORS: SectorIdType[] = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];

// ─── Blank per-sector breakdown ───────────────────────────────────────────────
function blankBreakdown(): SectorSignalBreakdownType {
  return {
    fii_net_cr:        null,
    dii_net_cr:        null,
    pcr:               null,
    block_deal_net_cr: null,
    mf_inflow_cr:      null,
    data_completeness: 0,
  };
}

function initResult(): Record<SectorIdType, SectorSignalBreakdownType> {
  return Object.fromEntries(
    ALL_SECTORS.map(s => [s, blankBreakdown()])
  ) as Record<SectorIdType, SectorSignalBreakdownType>;
}

// ─── FII/DII — distribute aggregate to sectors by NIFTY weight ───────────────
function applyFIIDII(
  payload: SignalPayloadType,
  result: Record<SectorIdType, SectorSignalBreakdownType>,
): void {
  const data = payload.data as Record<string, unknown>;
  const fii = data.fii as { net_value?: number } | undefined;
  const dii = data.dii as { net_value?: number } | undefined;

  const fiiNet = typeof fii?.net_value === 'number' ? fii.net_value : null;
  const diiNet = typeof dii?.net_value === 'number' ? dii.net_value : null;

  if (fiiNet === null && diiNet === null) return;

  // Distribute proportionally to tracked sectors (total tracked weight = 0.86)
  const trackedWeight = ALL_SECTORS.reduce((sum, s) => sum + SECTOR_NIFTY_WEIGHTS[s], 0);

  for (const sector of ALL_SECTORS) {
    const weight = SECTOR_NIFTY_WEIGHTS[sector] / trackedWeight;
    if (fiiNet !== null) result[sector].fii_net_cr = Math.round(fiiNet * weight);
    if (diiNet !== null) result[sector].dii_net_cr = Math.round(diiNet * weight);
  }
}

// ─── Block deals — map each deal to its sector ───────────────────────────────
function applyBlockDeals(
  payload: SignalPayloadType,
  result: Record<SectorIdType, SectorSignalBreakdownType>,
): void {
  const data = payload.data as Record<string, unknown>;
  const rawDeals = data.deals;
  if (!Array.isArray(rawDeals) || rawDeals.length === 0) return;

  const deals = (rawDeals as Array<Record<string, unknown>>).map(d => ({
    scrip_code: String(d.scrip_code ?? ''),
    company:    String(d.company ?? ''),
    type:       String(d.type ?? 'buy'),
    value_cr:   typeof d.value_cr === 'number' ? d.value_cr : 0,
  }));

  const bySector = aggregateBlockDealsBySector(deals);

  for (const sector of ALL_SECTORS) {
    const net = bySector[sector].net_cr;
    // Only set if there was actually activity in this sector
    if (bySector[sector].buy_cr > 0 || bySector[sector].sell_cr > 0) {
      result[sector].block_deal_net_cr = Math.round(net);
    }
  }
}

// ─── Sector PCR — direct per-sector mapping from option chain ─────────────────
function applySectorPCR(
  payload: SignalPayloadType,
  result: Record<SectorIdType, SectorSignalBreakdownType>,
): void {
  const data = payload.data as Record<string, unknown>;
  const sectoral = data.sectoral_pcr;
  if (!Array.isArray(sectoral)) return;

  // Map index names to our sector IDs
  const INDEX_TO_SECTOR: Record<string, SectorIdType> = {
    'NIFTY IT':     'IT',
    'NIFTY BANK':   'BANKING',
    'NIFTY PHARMA': 'PHARMA',
    'NIFTY AUTO':   'AUTO',
    'NIFTY FMCG':   'FMCG',
    'NIFTY ENERGY': 'ENERGY',
    'NIFTY METAL':  'METALS',
  };

  for (const entry of sectoral as Array<Record<string, unknown>>) {
    const indexName = String(entry.index ?? '').toUpperCase();
    const sector = INDEX_TO_SECTOR[indexName];
    if (!sector) continue;
    if (typeof entry.pcr === 'number') {
      result[sector].pcr = entry.pcr;
    }
  }
}

// ─── Insider trades — map each filing to its sector (informational only) ─────
// Insider trades don't map cleanly to a single numeric signal in the breakdown,
// so we accumulate buy/sell value per sector and store net as block_deal fallback
// only if block_deal_net_cr is still null for that sector.
function applyInsiderTrades(
  payload: SignalPayloadType,
  result: Record<SectorIdType, SectorSignalBreakdownType>,
): void {
  const data = payload.data as Record<string, unknown>;
  const filings = data.filings;
  if (!Array.isArray(filings) || filings.length === 0) return;

  const netBySector: Record<SectorIdType, number> = Object.fromEntries(
    ALL_SECTORS.map(s => [s, 0])
  ) as Record<SectorIdType, number>;
  const hasBySector: Record<SectorIdType, boolean> = Object.fromEntries(
    ALL_SECTORS.map(s => [s, false])
  ) as Record<SectorIdType, boolean>;

  for (const f of filings as Array<Record<string, unknown>>) {
    const sector = mapCompany(String(f.scrip_code ?? ''), String(f.company ?? ''));
    if (!sector) continue;
    const value = typeof f.value_cr === 'number' ? f.value_cr : 0;
    const sign  = String(f.transaction_type) === 'buy' ? 1 : -1;
    netBySector[sector] += sign * value;
    hasBySector[sector] = true;
  }

  for (const sector of ALL_SECTORS) {
    if (!hasBySector[sector]) continue;
    // Only fill block_deal_net_cr if the BSE block deals agent didn't already populate it
    if (result[sector].block_deal_net_cr === null) {
      result[sector].block_deal_net_cr = Math.round(netBySector[sector]);
    }
  }
}

// ─── MF inflows — map AMFI categories to sectors ─────────────────────────────
function applyMFInflows(
  payload: SignalPayloadType,
  result: Record<SectorIdType, SectorSignalBreakdownType>,
): void {
  const data = payload.data as Record<string, unknown>;
  const categories = data.categories;
  if (!Array.isArray(categories)) return;

  // AMFI category name fragments → sector
  const CATEGORY_MAP: Array<{ keywords: string[]; sector: SectorIdType }> = [
    { keywords: ['it', 'tech', 'information tech', 'software'],      sector: 'IT' },
    { keywords: ['banking', 'financial', 'finance', 'bank'],         sector: 'BANKING' },
    { keywords: ['pharma', 'health', 'healthcare'],                   sector: 'PHARMA' },
    { keywords: ['auto', 'automobile', 'mobility'],                   sector: 'AUTO' },
    { keywords: ['fmcg', 'consumer', 'consumption'],                  sector: 'FMCG' },
    { keywords: ['energy', 'power', 'oil', 'gas', 'infra'],           sector: 'ENERGY' },
    { keywords: ['metal', 'mining', 'commodity', 'material'],         sector: 'METALS' },
  ];

  for (const cat of categories as Array<Record<string, unknown>>) {
    const name  = String(cat.category ?? '').toLowerCase();
    const inflow = typeof cat.net_inflow_cr === 'number' ? cat.net_inflow_cr : null;
    if (inflow === null) continue;

    for (const { keywords, sector } of CATEGORY_MAP) {
      if (keywords.some(k => name.includes(k))) {
        // Accumulate — multiple AMFI categories may map to same sector
        result[sector].mf_inflow_cr = (result[sector].mf_inflow_cr ?? 0) + inflow;
        break;
      }
    }
  }
}

// ─── Count completeness per sector ───────────────────────────────────────────
function computeCompleteness(result: Record<SectorIdType, SectorSignalBreakdownType>): void {
  for (const sector of ALL_SECTORS) {
    const s = result[sector];
    s.data_completeness = [
      s.fii_net_cr,
      s.dii_net_cr,
      s.pcr,
      s.block_deal_net_cr,
      s.mf_inflow_cr,
    ].filter(v => v !== null).length;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function aggregateSectorSignals(
  payloads: SignalPayloadType[],
): Record<SectorIdType, SectorSignalBreakdownType> {
  const result = initResult();

  for (const payload of payloads) {
    if (payload.status !== 'ok') continue;

    switch (payload.signal_id) {
      case 'sector_fii_cumulative':
        applyFIIDII(payload, result);
        break;
      case 'sector_fii_block_deals':
        applyBlockDeals(payload, result);
        break;
      case 'sector_pcr':
        applySectorPCR(payload, result);
        break;
      case 'sector_insider_trades':
        applyInsiderTrades(payload, result);
        break;
      case 'sector_mf_inflows':
        applyMFInflows(payload, result);
        break;
    }
  }

  computeCompleteness(result);
  return result;
}
