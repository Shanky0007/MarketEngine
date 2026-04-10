import { detectAnomalies } from '../synthesis/src/sectorScoring/anomalyDetector.js';
import type {
  SectorIdType,
  SectorScoreType,
  SectorSignalBreakdownType,
} from 'shared-types';

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

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SECTORS: SectorIdType[] = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];

function neutralSignals(): Record<SectorIdType, SectorSignalBreakdownType> {
  return Object.fromEntries(
    SECTORS.map(s => [s, {
      fii_net_cr: 100, dii_net_cr: 200, pcr: 1.0,
      block_deal_net_cr: 0, mf_inflow_cr: 300, data_completeness: 5,
    }])
  ) as Record<SectorIdType, SectorSignalBreakdownType>;
}

function makeScore(sector: SectorIdType, score: number, signals?: Partial<SectorSignalBreakdownType>, daysAgo = 1): SectorScoreType {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    sector,
    score,
    traffic_light: score >= 60 ? 'green' : score >= 40 ? 'amber' : 'red',
    beginner_label: 'Mixed institutional signals',
    signal_breakdown: {
      fii_net_cr: signals?.fii_net_cr ?? 100,
      dii_net_cr: signals?.dii_net_cr ?? 200,
      pcr: signals?.pcr ?? 1.0,
      block_deal_net_cr: signals?.block_deal_net_cr ?? 0,
      mf_inflow_cr: signals?.mf_inflow_cr ?? 300,
      data_completeness: signals?.data_completeness ?? 5,
    },
    computed_at: d.toISOString(),
    run_window: 'closing',
    is_partial: false,
  };
}

function neutralScores(): SectorScoreType[] {
  return SECTORS.map(s => makeScore(s, 55));
}

// ─── Test 1: consecutive_fii_sell ────────────────────────────────────────────
console.log('\n[1] consecutive_fii_sell — 3 negative FII sessions');
{
  const signals = neutralSignals();
  signals['IT'].fii_net_cr = -1500; // current session negative

  const historical: SectorScoreType[] = [
    makeScore('IT', 35, { fii_net_cr: -800 }, 1),
    makeScore('IT', 38, { fii_net_cr: -1200 }, 2),
    makeScore('IT', 42, { fii_net_cr: -600 }, 3),
    ...SECTORS.filter(s => s !== 'IT').map(s => makeScore(s, 55, {}, 1)),
    ...SECTORS.filter(s => s !== 'IT').map(s => makeScore(s, 55, {}, 2)),
    ...SECTORS.filter(s => s !== 'IT').map(s => makeScore(s, 55, {}, 3)),
  ];

  const result = detectAnomalies(neutralScores(), historical, signals);
  const a = result.find(x => x.anomaly_type === 'consecutive_fii_sell' && x.sector === 'IT');

  assert('Anomaly detected', !!a);
  assert('severity = HIGH', a?.severity === 'HIGH');
  assert('sector = IT', a?.sector === 'IT');
  assert('raw_data.streak_length = 4', (a?.raw_data as any)?.streak_length === 4);
  assert('alert_text is factual (no predictions)', !/(will|likely|expect|should|buy|sell)/i.test(a?.alert_text ?? ''));
  assert('disclaimer present', !!a?.disclaimer);
}

// ─── Test 2: pcr_threshold_breach — below 0.65 ───────────────────────────────
console.log('\n[2] pcr_threshold_breach — PCR below 0.65');
{
  const signals = neutralSignals();
  signals['BANKING'].pcr = 0.55;

  const result = detectAnomalies(neutralScores(), [], signals);
  const a = result.find(x => x.anomaly_type === 'pcr_threshold_breach' && x.sector === 'BANKING');

  assert('Anomaly detected', !!a);
  assert('severity = HIGH', a?.severity === 'HIGH');
  assert('raw_data.pcr = 0.55', (a?.raw_data as any)?.pcr === 0.55);
  assert('alert_text is factual', !/(will|likely|expect|should)/i.test(a?.alert_text ?? ''));
  assert('disclaimer present', !!a?.disclaimer);
}

// ─── Test 2b: pcr_threshold_breach — above 1.6 ───────────────────────────────
console.log('\n[2b] pcr_threshold_breach — PCR above 1.6');
{
  const signals = neutralSignals();
  signals['PHARMA'].pcr = 1.75;

  const result = detectAnomalies(neutralScores(), [], signals);
  const a = result.find(x => x.anomaly_type === 'pcr_threshold_breach' && x.sector === 'PHARMA');

  assert('Anomaly detected', !!a);
  assert('severity = HIGH', a?.severity === 'HIGH');
  assert('raw_data.pcr = 1.75', (a?.raw_data as any)?.pcr === 1.75);
}

// ─── Test 3: score_reversal ───────────────────────────────────────────────────
console.log('\n[3] score_reversal — 25+ point swing');
{
  const currentScores: SectorScoreType[] = [
    ...SECTORS.filter(s => s !== 'AUTO').map(s => makeScore(s, 55)),
    makeScore('AUTO', 82), // jumped from 45 → 82
  ];
  const historical: SectorScoreType[] = [
    makeScore('AUTO', 45, {}, 1),
    ...SECTORS.filter(s => s !== 'AUTO').map(s => makeScore(s, 55, {}, 1)),
  ];

  const result = detectAnomalies(currentScores, historical, neutralSignals());
  const a = result.find(x => x.anomaly_type === 'score_reversal' && x.sector === 'AUTO');

  assert('Anomaly detected', !!a);
  assert('severity = HIGH', a?.severity === 'HIGH');
  assert('raw_data.delta = 37', (a?.raw_data as any)?.delta === 37);
  assert('alert_text is factual', !/(will|likely|expect|should)/i.test(a?.alert_text ?? ''));
  assert('disclaimer present', !!a?.disclaimer);
}

// ─── Test 3b: no reversal when change < 25 ───────────────────────────────────
console.log('\n[3b] score_reversal — no trigger when delta < 25');
{
  const currentScores: SectorScoreType[] = SECTORS.map(s =>
    makeScore(s, s === 'FMCG' ? 65 : 55)
  );
  const historical: SectorScoreType[] = SECTORS.map(s =>
    makeScore(s, s === 'FMCG' ? 50 : 55, {}, 1)
  );

  const result = detectAnomalies(currentScores, historical, neutralSignals());
  const a = result.find(x => x.anomaly_type === 'score_reversal');
  assert('No reversal anomaly (delta=15)', !a);
}

// ─── Test 4: large_block_deal ─────────────────────────────────────────────────
console.log('\n[4] large_block_deal — net > ₹500 cr');
{
  const signals = neutralSignals();
  signals['ENERGY'].block_deal_net_cr = 750;

  const result = detectAnomalies(neutralScores(), [], signals);
  const a = result.find(x => x.anomaly_type === 'large_block_deal' && x.sector === 'ENERGY');

  assert('Anomaly detected', !!a);
  assert('severity = MEDIUM', a?.severity === 'MEDIUM');
  assert('raw_data.deal_value_cr = 750', (a?.raw_data as any)?.deal_value_cr === 750);
  assert('raw_data.deal_type = buy', (a?.raw_data as any)?.deal_type === 'buy');
  assert('disclaimer present', !!a?.disclaimer);
}

// ─── Test 4b: no trigger when deal ≤ 500 ─────────────────────────────────────
console.log('\n[4b] large_block_deal — no trigger when ≤ ₹500 cr');
{
  const signals = neutralSignals();
  signals['METALS'].block_deal_net_cr = 400;

  const result = detectAnomalies(neutralScores(), [], signals);
  const a = result.find(x => x.anomaly_type === 'large_block_deal');
  assert('No anomaly when deal = 400 cr', !a);
}

// ─── Test 5: dii_absorption_failure ──────────────────────────────────────────
console.log('\n[5] dii_absorption_failure — FII sell >2000, DII buy <500');
{
  const signals = neutralSignals();
  signals['METALS'].fii_net_cr = -2500;
  signals['METALS'].dii_net_cr = 300;

  const result = detectAnomalies(neutralScores(), [], signals);
  const a = result.find(x => x.anomaly_type === 'dii_absorption_failure' && x.sector === 'METALS');

  assert('Anomaly detected', !!a);
  assert('severity = MEDIUM', a?.severity === 'MEDIUM');
  assert('raw_data.fii_sell_cr = 2500', (a?.raw_data as any)?.fii_sell_cr === 2500);
  assert('raw_data.dii_buy_cr = 300', (a?.raw_data as any)?.dii_buy_cr === 300);
  assert('disclaimer present', !!a?.disclaimer);
}

// ─── Test 5b: no trigger when DII absorbs well ───────────────────────────────
console.log('\n[5b] dii_absorption_failure — no trigger when DII absorbs');
{
  const signals = neutralSignals();
  signals['IT'].fii_net_cr = -2500;
  signals['IT'].dii_net_cr = 800; // above 500 threshold

  const result = detectAnomalies(neutralScores(), [], signals);
  const a = result.find(x => x.anomaly_type === 'dii_absorption_failure');
  assert('No anomaly when DII buy = 800 cr', !a);
}

// ─── Test 6: sector_divergence ────────────────────────────────────────────────
console.log('\n[6] sector_divergence — one sector 80+ while market < 40');
{
  const currentScores: SectorScoreType[] = SECTORS.map(s =>
    makeScore(s, s === 'IT' ? 85 : 25)
  );

  const result = detectAnomalies(currentScores, [], neutralSignals());
  const a = result.find(x => x.anomaly_type === 'sector_divergence' && x.sector === 'IT');

  assert('Anomaly detected', !!a);
  assert('severity = MEDIUM', a?.severity === 'MEDIUM');
  assert('raw_data.divergent_sector = IT', (a?.raw_data as any)?.divergent_sector === 'IT');
  assert('raw_data.sector_score = 85', (a?.raw_data as any)?.sector_score === 85);
  assert('raw_data.market_score < 40', (a?.raw_data as any)?.market_score < 40);
  assert('disclaimer present', !!a?.disclaimer);
}

// ─── Test 6b: no divergence when market >= 40 ────────────────────────────────
console.log('\n[6b] sector_divergence — no trigger when market >= 40');
{
  const currentScores: SectorScoreType[] = SECTORS.map(s =>
    makeScore(s, s === 'IT' ? 85 : 45)
  );

  const result = detectAnomalies(currentScores, [], neutralSignals());
  const a = result.find(x => x.anomaly_type === 'sector_divergence');
  assert('No divergence when market score = 45', !a);
}

// ─── Test 7: clean day — no anomalies ────────────────────────────────────────
console.log('\n[7] Clean day — no anomalies');
{
  const result = detectAnomalies(neutralScores(), neutralScores().map(s => ({ ...s, computed_at: new Date(Date.now() - 86400000).toISOString() })), neutralSignals());
  const count = result.length;
  assert(`Returns empty array (got ${count})`, count === 0);
}

// ─── Test 8: disclaimer on every anomaly ─────────────────────────────────────
console.log('\n[8] All anomalies have disclaimer + no prohibited language');
{
  const signals = neutralSignals();
  signals['IT'].fii_net_cr = -2500;
  signals['IT'].dii_net_cr = 100;
  signals['BANKING'].pcr = 0.5;
  signals['PHARMA'].block_deal_net_cr = 800;

  const currentScores: SectorScoreType[] = [
    makeScore('IT', 82),
    ...SECTORS.filter(s => s !== 'IT').map(s => makeScore(s, 25)),
  ];

  const historical: SectorScoreType[] = [
    makeScore('IT', 45, {}, 1),
    ...SECTORS.filter(s => s !== 'IT').map(s => makeScore(s, 25, {}, 1)),
  ];

  const result = detectAnomalies(currentScores, historical, signals);
  assert('At least one anomaly detected', result.length > 0);
  for (const a of result) {
    assert(`${a.anomaly_type}/${a.sector} has disclaimer`, !!a.disclaimer && a.disclaimer.length > 0);
    assert(`${a.anomaly_type}/${a.sector} alert_text has no predictions`,
      !/(will|likely to|expect|should invest|going to)/i.test(a.alert_text));
    assert(`${a.anomaly_type}/${a.sector} has detected_at`, !!a.detected_at);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
