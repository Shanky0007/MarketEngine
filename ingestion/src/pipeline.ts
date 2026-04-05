import { runIngestion } from './orchestrator';
import { synthesiseBrief } from '../../synthesis/src/synthesiser';
import { publishToSubstack } from '../../publisher/src/substack';
import { alertGateFailure, alertPublishSuccess, alertIngestionFailures } from '../../synthesis/src/alerts';
import pg from 'pg';

const { Pool } = pg;

let _pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export async function runDailyPipeline(): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  console.log(`\n========================================`);
  console.log(`[Pipeline] Starting daily brief for ${date}`);
  console.log(`========================================\n`);

  // Step 1: Ingest all signals
  console.log('[Pipeline] Step 1/4 — Ingestion');
  const aggregated = await runIngestion();

  // Alert on failed signals
  const failedSignals = aggregated.signals
    .filter(s => s.status === 'failed')
    .map(s => s.signal_id);
  if (failedSignals.length > 0) {
    await alertIngestionFailures(date, failedSignals);
  }

  // Step 2: Synthesise brief
  console.log('\n[Pipeline] Step 2/4 — Synthesis');
  const { brief, audit, gatesPassed } = await synthesiseBrief(aggregated);

  // Step 3: Save to database (always — even if held)
  console.log('\n[Pipeline] Step 3/4 — Saving to database');
  try {
    let dbBriefId = audit.brief_id;

    if (brief) {
      // Delete old audit records for this date to avoid FK conflicts on re-runs
      await getPool().query(
        `DELETE FROM brief_audits WHERE brief_id IN (SELECT id FROM briefs WHERE brief_date = $1)`,
        [date]
      );

      const result = await getPool().query(
        `INSERT INTO briefs (id, brief_date, beginner_headline, beginner_body, beginner_takeaway, expert_summary, expert_signals, expert_anomalies, disclaimer, held)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (brief_date) DO UPDATE SET
           id = EXCLUDED.id,
           beginner_headline = EXCLUDED.beginner_headline,
           beginner_body = EXCLUDED.beginner_body,
           beginner_takeaway = EXCLUDED.beginner_takeaway,
           expert_summary = EXCLUDED.expert_summary,
           expert_signals = EXCLUDED.expert_signals,
           expert_anomalies = EXCLUDED.expert_anomalies,
           disclaimer = EXCLUDED.disclaimer,
           held = EXCLUDED.held
         RETURNING id`,
        [
          audit.brief_id,
          date,
          brief.beginner.headline,
          brief.beginner.body,
          brief.beginner.key_takeaway,
          brief.expert.summary_line,
          JSON.stringify(brief.expert.signals),
          brief.expert.anomalies,
          brief.disclaimer,
          !gatesPassed
        ]
      );
      dbBriefId = result.rows[0].id;
      console.log('[Pipeline] Brief saved to database');
    }

    await getPool().query(
      `INSERT INTO brief_audits (brief_id, generated_at, tinyfish_payloads, llm_prompt, llm_raw_output, gate_results)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dbBriefId,
        audit.generated_at,
        JSON.stringify(audit.tinyfish_payloads),
        audit.llm_prompt,
        audit.llm_raw_output,
        JSON.stringify(audit.gate_results)
      ]
    );
    console.log('[Pipeline] Audit record saved to database');
  } catch (err) {
    console.error('[Pipeline] Database error:', err);
  }

  // Step 4: Publish or hold
  if (!gatesPassed || !brief) {
    console.error('\n[Pipeline] ❌ Brief held — gates failed');
    await alertGateFailure(
      audit.brief_id,
      date,
      audit.gate_results.filter(g => !g.passed)
    );
    return;
  }

  console.log('\n[Pipeline] Step 4/4 — Publishing');
  const publishedUrl = await publishToSubstack(brief);

  if (publishedUrl) {
    await getPool().query(
      `UPDATE briefs SET published_at = NOW() WHERE brief_date = $1`,
      [date]
    );
  }

  await alertPublishSuccess(date, audit.brief_id);

  console.log(`\n[Pipeline] ✅ Done. Brief for ${date} complete.`);
  if (publishedUrl) console.log(`[Pipeline] URL: ${publishedUrl}`);
}

export async function closePipeline(): Promise<void> {
  if (_pool) await _pool.end();
}
