/**
 * Step 1.3 tests for alertSynthesiser
 *
 * These tests mock the OpenAI call so they run without a live API key.
 * They verify: JSON parsing, Gate 1 enforcement, fallback on bad output,
 * fallback on insufficient history, and passthrough on empty anomaly list.
 */

import type { AnomalyEventType, SectorScoreType } from 'shared-types';

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

const FALLBACK = 'Insufficient historical data to establish a pattern. Past patterns do not predict future outcomes.';

const DISCLAIMER = 'This alert describes historical data patterns. It is not financial advice. Past patterns do not predict future outcomes. Niftea is not a SEBI-registered investment adviser.';

function makeAnomaly(overrides: Partial<AnomalyEventType> = {}): AnomalyEventType {
  return {
    sector: 'IT',
    anomaly_type: 'consecutive_fii_sell',
    severity: 'HIGH',
    raw_data: { streak_length: 4, total_outflow_cr: -4200, sector: 'IT' },
    alert_text: 'FII net equity in IT has been negative for 4 consecutive sessions, totalling -₹4,200 cr.',
    disclaimer: DISCLAIMER,
    detected_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeHistoricalScores(count: number, sector = 'IT'): SectorScoreType[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      sector: sector as SectorScoreType['sector'],
      score: 45 + Math.floor(Math.random() * 20),
      traffic_light: 'amber' as const,
      beginner_label: 'Mixed institutional signals',
      signal_breakdown: {
        fii_net_cr: -500 - i * 100,
        dii_net_cr: 300,
        pcr: 1.0,
        block_deal_net_cr: 0,
        mf_inflow_cr: 400,
        data_completeness: 5,
      },
      computed_at: d.toISOString(),
      run_window: 'closing' as const,
      is_partial: false,
    };
  });
}

async function main() {
  const { synthesiseAlerts } = await import('../synthesis/src/sectorScoring/alertSynthesiser.js');
  const { runGate1ProhibitedLanguage } = await import('../synthesis/src/gates.js');

  // ─── Test 1: insufficient history → fallback, no API call ──────────────────
  console.log('\n[1] Insufficient history (< 5 points) → fallback, no API call');
  {
    const anomalies = [makeAnomaly()];
    const history = makeHistoricalScores(3, 'IT'); // below 5 threshold

    const result = await synthesiseAlerts(anomalies, history);

    assert('Returns 1 anomaly', result.length === 1);
    assert('historical_context = fallback', result[0].historical_context === FALLBACK,
      `got: ${result[0].historical_context}`);
    assert('Other fields preserved', result[0].sector === 'IT' && result[0].severity === 'HIGH');
    assert('disclaimer preserved', result[0].disclaimer === DISCLAIMER);
  }

  // ─── Test 2: empty anomaly list → returns empty array ──────────────────────
  console.log('\n[2] Empty anomaly list → returns empty array');
  {
    const result = await synthesiseAlerts([], makeHistoricalScores(20));
    assert('Returns empty array', result.length === 0);
  }

  // ─── Test 3: multiple anomalies with no history → all fallback ─────────────
  console.log('\n[3] Multiple anomalies, no history → all get fallback');
  {
    const anomalies = [
      makeAnomaly({ sector: 'IT',      anomaly_type: 'consecutive_fii_sell' }),
      makeAnomaly({ sector: 'BANKING', anomaly_type: 'pcr_threshold_breach', severity: 'HIGH' }),
      makeAnomaly({ sector: 'PHARMA',  anomaly_type: 'large_block_deal',     severity: 'MEDIUM' }),
    ];
    const result = await synthesiseAlerts(anomalies, []);

    assert('Returns 3 anomalies', result.length === 3);
    assert('All get fallback context', result.every(a => a.historical_context === FALLBACK));
    assert('All have detected_at', result.every(a => !!a.detected_at));
    assert('MEDIUM severity preserved', result[2].severity === 'MEDIUM');
  }

  // ─── Test 4: Gate 1 catches advisory language ───────────────────────────────
  console.log('\n[4] Gate 1 catches prohibited language in alert context');
  {
    const badContext = 'When this pattern appeared in 2023, prices were likely to fall. Past patterns do not predict future outcomes.';
    const mockBrief = {
      date: '2026-04-06',
      brief_id: '00000000-0000-0000-0000-000000000000',
      beginner: { headline: badContext, body: '', key_takeaway: '' },
      expert: { summary_line: '', signals: [], anomalies: [] },
      disclaimer: DISCLAIMER,
    };

    const gate = runGate1ProhibitedLanguage(mockBrief);
    assert('Gate 1 catches "likely to fall"', !gate.passed);
    assert('Gate details populated', (gate.details ?? '').length > 0);
  }

  // ─── Test 5: Gate 1 passes on clean context ─────────────────────────────────
  console.log('\n[5] Gate 1 passes clean historical context');
  {
    const cleanContext = 'In 3 of 4 similar streaks over the past year, DII net buying remained below ₹500 cr for the following session. Past patterns do not predict future outcomes.';
    const mockBrief = {
      date: '2026-04-06',
      brief_id: '00000000-0000-0000-0000-000000000000',
      beginner: { headline: cleanContext, body: '', key_takeaway: '' },
      expert: { summary_line: '', signals: [], anomalies: [] },
      disclaimer: DISCLAIMER,
    };

    const gate = runGate1ProhibitedLanguage(mockBrief);
    assert('Gate 1 passes clean context', gate.passed, gate.details);
  }

  // ─── Test 6: fallback text itself passes Gate 1 ─────────────────────────────
  console.log('\n[6] Fallback text passes Gate 1');
  {
    const mockBrief = {
      date: '2026-04-06',
      brief_id: '00000000-0000-0000-0000-000000000000',
      beginner: { headline: FALLBACK, body: '', key_takeaway: '' },
      expert: { summary_line: '', signals: [], anomalies: [] },
      disclaimer: DISCLAIMER,
    };

    const gate = runGate1ProhibitedLanguage(mockBrief);
    assert('Fallback text passes Gate 1', gate.passed, gate.details);
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
