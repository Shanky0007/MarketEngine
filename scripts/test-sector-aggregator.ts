import { aggregateSectorSignals } from '../ingestion/src/sectorAggregator.js';
import type { SignalPayloadType } from 'shared-types';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function makePayload(signal_id: string, data: Record<string, unknown>, status: 'ok' | 'failed' = 'ok'): SignalPayloadType {
  return {
    signal_id,
    source_url: 'https://example.com',
    extracted_at: new Date().toISOString(),
    status,
    data,
  };
}

// ─── Test 1: FII/DII distributed across sectors by NIFTY weight ──────────────
console.log('\n[1] FII/DII distributed by NIFTY weight');
{
  const payload = makePayload('sector_fii_cumulative', {
    fii: { net_value: 10000 },
    dii: { net_value: 5000 },
    unit: 'crores INR',
  });
  const result = aggregateSectorSignals([payload]);

  // BANKING gets highest weight (0.28 / 0.86 of tracked)
  // IT gets 0.15 / 0.86
  assert('BANKING fii_net_cr > IT fii_net_cr', (result.BANKING.fii_net_cr ?? 0) > (result.IT.fii_net_cr ?? 0));
  assert('All sectors have fii_net_cr set', Object.values(result).every(s => s.fii_net_cr !== null));
  assert('All sectors have dii_net_cr set', Object.values(result).every(s => s.dii_net_cr !== null));

  // Total FII across all sectors should approximately equal 10000
  const totalFII = Object.values(result).reduce((sum, s) => sum + (s.fii_net_cr ?? 0), 0);
  assert(`Total FII across sectors ≈ 10000 (got ${totalFII})`, Math.abs(totalFII - 10000) <= 10);
}

// ─── Test 2: Block deals mapped to correct sectors ────────────────────────────
console.log('\n[2] Block deals mapped to sectors');
{
  const payload = makePayload('sector_fii_block_deals', {
    deals: [
      { scrip_code: '500209', company: 'Infosys',    type: 'buy',  value_cr: 400 },
      { scrip_code: '532540', company: 'TCS',         type: 'sell', value_cr: 150 },
      { scrip_code: '500180', company: 'HDFC Bank',   type: 'buy',  value_cr: 600 },
    ],
    count: 3,
    session: 'full day',
  });
  const result = aggregateSectorSignals([payload]);

  assert('IT block_deal_net_cr = 250 (400-150)', result.IT.block_deal_net_cr === 250, `got ${result.IT.block_deal_net_cr}`);
  assert('BANKING block_deal_net_cr = 600', result.BANKING.block_deal_net_cr === 600, `got ${result.BANKING.block_deal_net_cr}`);
  assert('PHARMA block_deal_net_cr = null (no deals)', result.PHARMA.block_deal_net_cr === null);
}

// ─── Test 3: Sector PCR mapped to correct sectors ────────────────────────────
console.log('\n[3] Sector PCR direct mapping');
{
  const payload = makePayload('sector_pcr', {
    sectoral_pcr: [
      { index: 'NIFTY IT',     pcr: 0.85, max_pain: 20000 },
      { index: 'NIFTY BANK',   pcr: 1.2,  max_pain: 45000 },
      { index: 'NIFTY PHARMA', pcr: 0.95, max_pain: 18000 },
      { index: 'NIFTY AUTO',   pcr: 1.05, max_pain: 21000 },
    ],
    nifty_pcr: 1.1,
  });
  const result = aggregateSectorSignals([payload]);

  assert('IT pcr = 0.85', result.IT.pcr === 0.85, `got ${result.IT.pcr}`);
  assert('BANKING pcr = 1.2', result.BANKING.pcr === 1.2, `got ${result.BANKING.pcr}`);
  assert('PHARMA pcr = 0.95', result.PHARMA.pcr === 0.95, `got ${result.PHARMA.pcr}`);
  assert('FMCG pcr = null (not in payload)', result.FMCG.pcr === null);
}

// ─── Test 4: MF inflows mapped by category keywords ──────────────────────────
console.log('\n[4] MF inflows mapped to sectors');
{
  const payload = makePayload('sector_mf_inflows', {
    week_ending: '2026-04-04',
    categories: [
      { category: 'IT/Technology funds',       net_inflow_cr: 800 },
      { category: 'Banking/Financial funds',    net_inflow_cr: 1200 },
      { category: 'Pharma/Healthcare funds',    net_inflow_cr: 400 },
      { category: 'Large Cap',                  net_inflow_cr: 2000 }, // no sector match
    ],
  });
  const result = aggregateSectorSignals([payload]);

  assert('IT mf_inflow_cr = 800', result.IT.mf_inflow_cr === 800, `got ${result.IT.mf_inflow_cr}`);
  assert('BANKING mf_inflow_cr = 1200', result.BANKING.mf_inflow_cr === 1200, `got ${result.BANKING.mf_inflow_cr}`);
  assert('PHARMA mf_inflow_cr = 400', result.PHARMA.mf_inflow_cr === 400, `got ${result.PHARMA.mf_inflow_cr}`);
  assert('METALS mf_inflow_cr = null (no match)', result.METALS.mf_inflow_cr === null);
}

// ─── Test 5: Insider trades fill block_deal when BSE agent absent ─────────────
console.log('\n[5] Insider trades fallback to block_deal_net_cr');
{
  const payload = makePayload('sector_insider_trades', {
    filings: [
      { scrip_code: '500470', company: 'Tata Steel', insider_name: 'Director', transaction_type: 'buy',  shares: 100000, value_cr: 300 },
      { scrip_code: '500400', company: 'JSW Steel',  insider_name: 'CEO',      transaction_type: 'sell', shares: 50000,  value_cr: 100 },
    ],
    count: 2,
  });
  const result = aggregateSectorSignals([payload]);

  assert('METALS block_deal_net_cr = 200 (300-100)', result.METALS.block_deal_net_cr === 200, `got ${result.METALS.block_deal_net_cr}`);
  assert('IT block_deal_net_cr = null (no filings)', result.IT.block_deal_net_cr === null);
}

// ─── Test 6: Failed payloads are ignored ─────────────────────────────────────
console.log('\n[6] Failed payloads skipped');
{
  const ok = makePayload('sector_fii_cumulative', {
    fii: { net_value: 5000 },
    dii: { net_value: 2000 },
  });
  const failed_payload = makePayload('sector_pcr', { sectoral_pcr: [{ index: 'NIFTY IT', pcr: 0.5 }] }, 'failed');
  const result = aggregateSectorSignals([ok, failed_payload]);

  assert('FII distributed from ok payload', result.IT.fii_net_cr !== null);
  assert('PCR null (failed payload ignored)', result.IT.pcr === null);
}

// ─── Test 7: data_completeness counting ──────────────────────────────────────
console.log('\n[7] data_completeness count');
{
  const payloads = [
    makePayload('sector_fii_cumulative', { fii: { net_value: 1000 }, dii: { net_value: 500 } }),
    makePayload('sector_pcr', { sectoral_pcr: [{ index: 'NIFTY IT', pcr: 1.1 }] }),
    makePayload('sector_fii_block_deals', { deals: [{ scrip_code: '500209', company: 'Infosys', type: 'buy', value_cr: 300 }], count: 1 }),
  ];
  const result = aggregateSectorSignals(payloads);

  // IT has fii(1) + dii(1) + pcr(1) + block_deal(1) = 4
  assert('IT data_completeness = 4', result.IT.data_completeness === 4, `got ${result.IT.data_completeness}`);
  // BANKING has fii(1) + dii(1) = 2
  assert('METALS data_completeness = 2 (no block deal, no PCR)', result.METALS.data_completeness === 2, `got ${result.METALS.data_completeness}`);
}

// ─── Test 8: all 7 sectors always present ────────────────────────────────────
console.log('\n[8] All 7 sectors always present in output');
{
  const result = aggregateSectorSignals([]);
  const sectors = Object.keys(result);
  const expected = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];
  assert('All 7 sectors present', expected.every(s => sectors.includes(s)), `got ${sectors.join(', ')}`);
  assert('All data_completeness = 0 on empty input', Object.values(result).every(s => s.data_completeness === 0));
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
