import 'dotenv/config';
import { synthesiseBrief } from '../synthesis/src/synthesiser';
import { publishToSubstack } from '../publisher/src/substack';
import { alertGateFailure, alertPublishSuccess } from '../synthesis/src/alerts';
import type { AggregatedSignalsType } from 'shared-types';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Mock aggregated data (skips TinyFish to save steps)
const MOCK_AGGREGATED: AggregatedSignalsType = {
  date: new Date().toISOString().split('T')[0],
  generated_at: new Date().toISOString(),
  signals: [
    { signal_id: "fii_dii", source_url: "https://www.nseindia.com/market-data/fii-dii-activity", extracted_at: new Date().toISOString(), status: "ok", data: { fii: { buy: 14823, sell: 17291, net: -2468 }, dii: { buy: 19104, sell: 14201, net: 4903 }, unit: "crores INR" } },
    { signal_id: "sgx_nifty", source_url: "https://www.google.com/finance/quote/NIFTY_50:INDEXNSE", extracted_at: new Date().toISOString(), status: "ok", data: { price: 22340.5, change_pct: -0.42 } },
    { signal_id: "usd_inr", source_url: "https://www.google.com/finance/quote/USD-INR", extracted_at: new Date().toISOString(), status: "ok", data: { rate: 84.72, change_pct: 0.18 } },
    { signal_id: "brent_crude", source_url: "https://oilprice.com/oil-price-charts/", extracted_at: new Date().toISOString(), status: "unavailable", data: { status: "unavailable" } },
  ],
  failed_count: 1,
  ok_count: 3
};

async function test() {
  const date = MOCK_AGGREGATED.date;
  console.log(`[Test Pipeline] Starting for ${date}\n`);

  // Step 1: Skip ingestion — use mock data
  console.log('[Step 1] Using mock ingestion data (3 ok, 1 unavailable)');

  // Step 2: Synthesis
  console.log('\n[Step 2] Running synthesis...');
  const { brief, audit, gatesPassed } = await synthesiseBrief(MOCK_AGGREGATED);

  // Step 3: Save to DB
  console.log('\n[Step 3] Saving to database...');
  try {
    if (brief) {
      await pool.query(
        `INSERT INTO briefs (id, brief_date, beginner_headline, beginner_body, beginner_takeaway, expert_summary, expert_signals, expert_anomalies, disclaimer, held)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (brief_date) DO UPDATE SET
           beginner_headline = EXCLUDED.beginner_headline,
           beginner_body = EXCLUDED.beginner_body,
           beginner_takeaway = EXCLUDED.beginner_takeaway,
           expert_summary = EXCLUDED.expert_summary,
           expert_signals = EXCLUDED.expert_signals,
           expert_anomalies = EXCLUDED.expert_anomalies,
           disclaimer = EXCLUDED.disclaimer,
           held = EXCLUDED.held`,
        [audit.brief_id, date, brief.beginner.headline, brief.beginner.body, brief.beginner.key_takeaway, brief.expert.summary_line, JSON.stringify(brief.expert.signals), brief.expert.anomalies, brief.disclaimer, !gatesPassed]
      );
      console.log('  ✅ Brief saved');
    }

    await pool.query(
      `INSERT INTO brief_audits (brief_id, generated_at, tinyfish_payloads, llm_prompt, llm_raw_output, gate_results)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [audit.brief_id, audit.generated_at, JSON.stringify(audit.tinyfish_payloads), audit.llm_prompt, audit.llm_raw_output, JSON.stringify(audit.gate_results)]
    );
    console.log('  ✅ Audit saved');
  } catch (err) {
    console.error('  ❌ DB error:', err);
  }

  // Step 4: Publish or hold
  if (!gatesPassed || !brief) {
    console.log('\n[Step 4] ❌ Brief held');
    await alertGateFailure(audit.brief_id, date, audit.gate_results.filter(g => !g.passed));
  } else {
    console.log('\n[Step 4] Publishing...');
    await publishToSubstack(brief);
    await alertPublishSuccess(date, audit.brief_id);
  }

  // Verify DB
  console.log('\n[Verify] Checking database...');
  const briefRow = await pool.query('SELECT id, brief_date, beginner_headline, held FROM briefs WHERE brief_date = $1', [date]);
  const auditRow = await pool.query('SELECT id, brief_id FROM brief_audits WHERE brief_id = $1', [audit.brief_id]);

  console.log(`  Brief in DB: ${briefRow.rows.length > 0 ? '✅' : '❌'} ${briefRow.rows[0]?.beginner_headline || 'NOT FOUND'}`);
  console.log(`  Audit in DB: ${auditRow.rows.length > 0 ? '✅' : '❌'}`);

  await pool.end();
  console.log('\n✅ PIPELINE TEST COMPLETE');
}

test();
