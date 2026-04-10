import {
  computeSectorScore,
  computeAllSectors,
  normaliseFIINet,
  normalisePCR,
  normaliseDIINet,
  normaliseBlockDeal,
  normaliseMFInflow,
} from '../synthesis/src/sectorScoring/scoringEngine.js';
import type { SectorSignalBreakdownType, SectorIdType } from 'shared-types';

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

// ─── Normalisation sanity checks ─────────────────────────────────────────────
console.log('\n[1] Normalisation functions');
assert('normaliseFIINet(-5000) = 0',  normaliseFIINet(-5000) === 0);
assert('normaliseFIINet(0) = 50',     normaliseFIINet(0) === 50);
assert('normaliseFIINet(5000) = 100', normaliseFIINet(5000) === 100);
assert('normaliseFIINet(10000) clamped to 100', normaliseFIINet(10000) === 100);
assert('normaliseFIINet(-9999) clamped to 0',   normaliseFIINet(-9999) === 0);

assert('normalisePCR(0.4) = 10',  normalisePCR(0.4) === 10);
assert('normalisePCR(1.0) in 50–65', normalisePCR(1.0) >= 50 && normalisePCR(1.0) <= 65);
assert('normalisePCR(2.0) = 90',  normalisePCR(2.0) === 90);
assert('normalisePCR(0.65) in 10–30', normalisePCR(0.65) >= 10 && normalisePCR(0.65) <= 30);

assert('normaliseDIINet(-3000) = 0', normaliseDIINet(-3000) === 0);
assert('normaliseDIINet(0) = 50',    normaliseDIINet(0) === 50);

assert('normaliseBlockDeal(-2000) = 0',  normaliseBlockDeal(-2000) === 0);
assert('normaliseBlockDeal(0) = 50',     normaliseBlockDeal(0) === 50);
assert('normaliseBlockDeal(2000) = 100', normaliseBlockDeal(2000) === 100);

assert('normaliseMFInflow(0, 300) = 20',     normaliseMFInflow(0, 300) === 20);
assert('normaliseMFInflow(-100, 300) = 20',  normaliseMFInflow(-100, 300) === 20);
assert('normaliseMFInflow(600, 300) = 80',   normaliseMFInflow(600, 300) === 80);
assert('normaliseMFInflow(9999, 300) = 80',  normaliseMFInflow(9999, 300) === 80);
assert('normaliseMFInflow(300, 300) ≈ 55',   normaliseMFInflow(300, 300) === 55);

// ─── Plan test 1: all signals present — strong bullish ────────────────────────
console.log('\n[2] Full signals — strong bullish (expected score 72–78, green)');
const full: SectorSignalBreakdownType = {
  fii_net_cr: 3000,
  pcr: 1.1,
  dii_net_cr: 2000,
  block_deal_net_cr: 500,
  mf_inflow_cr: 400,
  data_completeness: 5,
};
const s1 = computeSectorScore('IT', full, 300);
console.log('  Score:', s1.score, '| Traffic light:', s1.traffic_light);
assert('Score in range 72–78', s1.score >= 72 && s1.score <= 78, `got ${s1.score}`);
assert('Traffic light = green', s1.traffic_light === 'green');
assert('is_partial = false (completeness 5)', s1.is_partial === false);
assert('score is integer', Number.isInteger(s1.score));

// ─── Plan test 2: FII-only (others null) — weight redistributed ───────────────
console.log('\n[3] FII-only signals — weight redistribution');
const fiiOnly: SectorSignalBreakdownType = {
  fii_net_cr: 3000,
  pcr: null,
  dii_net_cr: null,
  block_deal_net_cr: null,
  mf_inflow_cr: null,
  data_completeness: 1,
};
const s2 = computeSectorScore('BANKING', fiiOnly, 500);
console.log('  Score:', s2.score, '| Traffic light:', s2.traffic_light);
// fii_net=3000 → normaliseFIINet(3000) = 80, weight=1.0 (only signal) → score=80
assert('Score = 80 (FII alone, full weight)', s2.score === 80, `got ${s2.score}`);
assert('Traffic light = green', s2.traffic_light === 'green');
assert('is_partial = true (completeness 1)', s2.is_partial === true);

// ─── Plan test 3: strong bearish ─────────────────────────────────────────────
console.log('\n[4] Strong bearish (expected score 20–28, red)');
const bearish: SectorSignalBreakdownType = {
  fii_net_cr: -4000,
  pcr: 0.6,
  dii_net_cr: null,
  block_deal_net_cr: null,
  mf_inflow_cr: null,
  data_completeness: 2,
};
const s3 = computeSectorScore('PHARMA', bearish, 400);
console.log('  Score:', s3.score, '| Traffic light:', s3.traffic_light);
assert('Score in range 10–28', s3.score >= 10 && s3.score <= 28, `got ${s3.score}`);
assert('Traffic light = red', s3.traffic_light === 'red');

// ─── Plan test 4: all nulls — neutral 50 ─────────────────────────────────────
console.log('\n[5] All signals null — neutral');
const empty: SectorSignalBreakdownType = {
  fii_net_cr: null,
  pcr: null,
  dii_net_cr: null,
  block_deal_net_cr: null,
  mf_inflow_cr: null,
  data_completeness: 0,
};
const s4 = computeSectorScore('METALS', empty, 350);
assert('Score = 50 when all null', s4.score === 50, `got ${s4.score}`);
assert('Traffic light = amber', s4.traffic_light === 'amber');
assert('is_partial = true', s4.is_partial === true);

// ─── Plan test 5: score always integer 0–100 across extremes ─────────────────
console.log('\n[6] Boundary — all scores must be integers 0–100');
const extremes: SectorSignalBreakdownType[] = [
  { fii_net_cr: -99999, pcr: 0.1,  dii_net_cr: -99999, block_deal_net_cr: -99999, mf_inflow_cr: -99999, data_completeness: 5 },
  { fii_net_cr:  99999, pcr: 9.9,  dii_net_cr:  99999, block_deal_net_cr:  99999, mf_inflow_cr:  99999, data_completeness: 5 },
  { fii_net_cr:      0, pcr: 1.0,  dii_net_cr:      0, block_deal_net_cr:      0, mf_inflow_cr:     0,  data_completeness: 5 },
];
for (const sig of extremes) {
  const s = computeSectorScore('AUTO', sig, 500);
  assert(`score ${s.score} is integer`, Number.isInteger(s.score));
  assert(`score ${s.score} is in 0–100`, s.score >= 0 && s.score <= 100);
}

// ─── Plan test 6: computeAllSectors returns 7 scores ─────────────────────────
console.log('\n[7] computeAllSectors — 7 sectors');
const sectors: SectorIdType[] = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];
const signalsBySector = Object.fromEntries(sectors.map(s => [s, full])) as Record<SectorIdType, SectorSignalBreakdownType>;
const mfAvg = Object.fromEntries(sectors.map(s => [s, 500])) as Record<SectorIdType, number>;
const all = computeAllSectors(signalsBySector, mfAvg, 'closing');
assert('Returns 7 scores', all.length === 7);
assert('All sectors covered', sectors.every(s => all.some(r => r.sector === s)));
assert('All scores are integers', all.every(r => Number.isInteger(r.score)));
assert('All scores in 0–100', all.every(r => r.score >= 0 && r.score <= 100));
assert('All run_window = closing', all.every(r => r.run_window === 'closing'));

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
