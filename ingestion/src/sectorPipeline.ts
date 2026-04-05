import { runAllAgents } from './agents/runner.js';
import { SECTOR_AGENT_GOALS } from './agents/goals.js';
import { aggregateSectorSignals } from './sectorAggregator.js';
import { computeAllSectors } from '../../synthesis/src/sectorScoring/scoringEngine.js';
import { detectAnomalies } from '../../synthesis/src/sectorScoring/anomalyDetector.js';
import { synthesiseAlerts } from '../../synthesis/src/sectorScoring/alertSynthesiser.js';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type { SectorScoreType } from 'shared-types';

const { Pool } = pg;

let _pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export async function runSectorPipeline(
  window: 'morning' | 'midsession' | 'closing'
): Promise<void> {
  const runId  = uuidv4();
  const runTime = new Date().toISOString();

  console.log(`\n[Sector Pipeline] Starting ${window} run — ${runTime}`);

  // Step 1: Run TinyFish agents (skip MF inflows on non-Monday — weekly data)
  const agents    = Object.values(SECTOR_AGENT_GOALS);
  const isMonday  = new Date().getDay() === 1;
  const activeAgents = isMonday
    ? agents
    : agents.filter(a => a.signal_id !== 'sector_mf_inflows');

  console.log(`[Sector Pipeline] Running ${activeAgents.length} agents (MF inflows: ${isMonday ? 'yes' : 'skipped — not Monday'})`);
  const payloads = await runAllAgents(activeAgents);

  // Step 2: Aggregate raw payloads → per-sector signal breakdown
  const signalsBySector = aggregateSectorSignals(payloads);

  // Step 3: Fetch MF weekly averages from DB for score normalisation
  let mfAvgBySector: Record<string, number> = {};
  try {
    const { rows } = await getPool().query<{ sector: string; avg_cr: number }>(
      'SELECT sector, avg_cr FROM mf_weekly_averages'
    );
    mfAvgBySector = Object.fromEntries(rows.map(r => [r.sector, Number(r.avg_cr)]));
  } catch (err) {
    console.warn('[Sector Pipeline] Could not fetch MF averages — using defaults:', (err as Error).message);
  }

  // Step 4: Compute scores deterministically
  const scores = computeAllSectors(signalsBySector, mfAvgBySector, window);

  // Step 5: Fetch last 30 days of scores for anomaly detection
  let historicalScores: SectorScoreType[] = [];
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { rows } = await getPool().query<{
      sector: string; score: number; traffic_light: string;
      beginner_label: string; signal_breakdown: unknown;
      computed_at: string; run_window: string; is_partial: boolean;
    }>(
      `SELECT sector, score, traffic_light, beginner_label,
              signal_breakdown, run_time AS computed_at, run_window, is_partial
       FROM sector_scores
       WHERE run_time >= $1
       ORDER BY run_time DESC`,
      [cutoff]
    );
    historicalScores = rows.map(r => ({
      sector:          r.sector as SectorScoreType['sector'],
      score:           r.score,
      traffic_light:   r.traffic_light as SectorScoreType['traffic_light'],
      beginner_label:  r.beginner_label,
      signal_breakdown: r.signal_breakdown as SectorScoreType['signal_breakdown'],
      computed_at:     r.computed_at,
      run_window:      r.run_window as SectorScoreType['run_window'],
      is_partial:      r.is_partial,
    }));
  } catch (err) {
    console.warn('[Sector Pipeline] Could not fetch historical scores — anomaly detection may be limited:', (err as Error).message);
  }

  // Step 6: Detect anomalies (deterministic)
  const rawAnomalies = detectAnomalies(scores, historicalScores, signalsBySector);

  // Step 7: Claude enriches anomalies with historical context (if any)
  const anomalies = rawAnomalies.length > 0
    ? await synthesiseAlerts(rawAnomalies, historicalScores)
    : [];

  // Step 8: Persist scores
  for (const score of scores) {
    try {
      await getPool().query(
        `INSERT INTO sector_scores
           (run_id, run_time, run_window, sector, score, traffic_light,
            signal_breakdown, beginner_label, data_completeness)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          runId,
          runTime,
          window,
          score.sector,
          score.score,
          score.traffic_light,
          JSON.stringify(score.signal_breakdown),
          score.beginner_label,
          score.signal_breakdown.data_completeness,
        ]
      );
    } catch (err) {
      console.error(`[Sector Pipeline] Failed to save score for ${score.sector}:`, (err as Error).message);
    }
  }

  // Step 9: Persist anomaly events
  for (const anomaly of anomalies) {
    try {
      await getPool().query(
        `INSERT INTO anomaly_events
           (sector, anomaly_type, severity, raw_data, alert_text,
            historical_context, disclaimer, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          anomaly.sector,
          anomaly.anomaly_type,
          anomaly.severity,
          JSON.stringify(anomaly.raw_data),
          anomaly.alert_text,
          anomaly.historical_context ?? null,
          anomaly.disclaimer,
          anomaly.detected_at,
        ]
      );
    } catch (err) {
      console.error(`[Sector Pipeline] Failed to save anomaly ${anomaly.anomaly_type}:`, (err as Error).message);
    }
  }

  // Step 10: Persist score audit trail
  try {
    await getPool().query(
      `INSERT INTO score_audits (run_id, tinyfish_payloads, scoring_inputs, scores_computed)
       VALUES ($1, $2, $3, $4)`,
      [
        runId,
        JSON.stringify(payloads),
        JSON.stringify(signalsBySector),
        JSON.stringify(scores),
      ]
    );
  } catch (err) {
    console.error('[Sector Pipeline] Failed to save score audit:', (err as Error).message);
  }

  const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
  console.log(`[Sector Pipeline] ${window} complete:`);
  console.log(`  Scores: ${scores.length} sectors computed`);
  console.log(`  Anomalies: ${anomalies.length} (${highCount} HIGH)`);
  scores.forEach(s =>
    console.log(`  ${s.sector}: ${s.score} (${s.traffic_light})${s.is_partial ? ' [partial]' : ''}`)
  );
}

export async function closeSectorPipeline(): Promise<void> {
  if (_pool) await _pool.end();
}
