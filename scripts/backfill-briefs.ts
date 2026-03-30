import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { synthesiseBrief } from '../synthesis/src/synthesiser';
import type { AggregatedSignalsType } from 'shared-types';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Generate realistic mock data with slight daily variations
function generateMockSignals(date: string, dayIndex: number): AggregatedSignalsType {
  const base = {
    fiiNet: -2500 + (dayIndex * 800) + Math.round(Math.random() * 1000 - 500),
    diiNet: 3500 + (dayIndex * 300) + Math.round(Math.random() * 800 - 400),
    nifty: 22100 + (dayIndex * 50) + Math.round(Math.random() * 200 - 100),
    niftyChange: -0.8 + (dayIndex * 0.3) + (Math.random() * 0.6 - 0.3),
    usdInr: 84.5 + (Math.random() * 0.5 - 0.25),
    usdInrChange: -0.2 + (Math.random() * 0.4),
    brent: 82 + (Math.random() * 3 - 1.5),
    brentChange: -1.5 + (Math.random() * 3),
    gold: 72500 + (dayIndex * 200) + Math.round(Math.random() * 500 - 250),
    goldChange: -0.5 + (Math.random() * 1),
  };

  return {
    date,
    generated_at: new Date().toISOString(),
    signals: [
      {
        signal_id: "fii_dii", source_url: "https://www.nseindia.com/market-data/fii-dii-activity",
        extracted_at: new Date().toISOString(), status: "ok",
        data: { fii: { buy: 15000, sell: 15000 - base.fiiNet, net: base.fiiNet }, dii: { buy: 18000, sell: 18000 - base.diiNet, net: base.diiNet }, unit: "crores INR", date }
      },
      {
        signal_id: "sgx_nifty", source_url: "https://www.google.com/finance/quote/NIFTY_50:INDEXNSE",
        extracted_at: new Date().toISOString(), status: "ok",
        data: { price: base.nifty, change_pct: Math.round(base.niftyChange * 100) / 100 }
      },
      {
        signal_id: "usd_inr", source_url: "https://www.google.com/finance/quote/USD-INR",
        extracted_at: new Date().toISOString(), status: "ok",
        data: { rate: Math.round(base.usdInr * 100) / 100, change_pct: Math.round(base.usdInrChange * 100) / 100 }
      },
      {
        signal_id: "brent_crude", source_url: "https://oilprice.com/oil-price-charts/",
        extracted_at: new Date().toISOString(), status: "ok",
        data: { price_usd: Math.round(base.brent * 100) / 100, change_pct: Math.round(base.brentChange * 100) / 100 }
      },
      {
        signal_id: "gold_mcx", source_url: "https://www.mcxindia.com/market-data/spot-market-price",
        extracted_at: new Date().toISOString(), status: "ok",
        data: { price_inr_10g: base.gold, change_pct: Math.round(base.goldChange * 100) / 100 }
      },
      {
        signal_id: "us_markets", source_url: "https://www.cnbc.com/world/?region=world",
        extracted_at: new Date().toISOString(), status: "ok",
        data: { dow: { close: 39200 + dayIndex * 100, change_pct: Math.round((Math.random() * 1.5 - 0.75) * 100) / 100 }, nasdaq: { close: 16400 + dayIndex * 80, change_pct: Math.round((Math.random() * 2 - 1) * 100) / 100 } }
      },
      {
        signal_id: "asia_cues", source_url: "https://www.cnbc.com/asia-markets/",
        extracted_at: new Date().toISOString(), status: "ok",
        data: { nikkei: { value: 38500 + dayIndex * 150, change_pct: Math.round((Math.random() * 1.5 - 0.75) * 100) / 100 }, hang_seng: { value: 16800 + dayIndex * 50, change_pct: Math.round((Math.random() * 2 - 1) * 100) / 100 } }
      },
    ],
    failed_count: 0,
    ok_count: 7
  };
}

// Get last 7 trading days (skip weekends)
function getTradingDays(count: number): string[] {
  const days: string[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) { // skip Sun/Sat
      days.push(d.toISOString().split('T')[0]);
    }
  }
  return days.reverse();
}

async function backfill() {
  const dates = getTradingDays(7);
  console.log(`[Backfill] Generating briefs for ${dates.length} trading days\n`);

  let passed = 0;
  let held = 0;
  const results: { date: string; status: string; headline?: string; heldReason?: string }[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    console.log(`[${i + 1}/7] ${date}...`);

    const mockData = generateMockSignals(date, i);
    const { brief, audit, gatesPassed } = await synthesiseBrief(mockData);

    if (brief && gatesPassed) {
      await pool.query(
        `INSERT INTO briefs (id, brief_date, beginner_headline, beginner_body, beginner_takeaway, expert_summary, expert_signals, expert_anomalies, disclaimer, held)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (brief_date) DO UPDATE SET
           id = EXCLUDED.id, beginner_headline = EXCLUDED.beginner_headline, beginner_body = EXCLUDED.beginner_body,
           beginner_takeaway = EXCLUDED.beginner_takeaway, expert_summary = EXCLUDED.expert_summary,
           expert_signals = EXCLUDED.expert_signals, expert_anomalies = EXCLUDED.expert_anomalies,
           disclaimer = EXCLUDED.disclaimer, held = EXCLUDED.held
         RETURNING id`,
        [audit.brief_id, date, brief.beginner.headline, brief.beginner.body, brief.beginner.key_takeaway,
         brief.expert.summary_line, JSON.stringify(brief.expert.signals), brief.expert.anomalies, brief.disclaimer, false]
      );

      await pool.query(
        `INSERT INTO brief_audits (brief_id, generated_at, tinyfish_payloads, llm_prompt, llm_raw_output, gate_results)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [audit.brief_id, audit.generated_at, JSON.stringify(audit.tinyfish_payloads),
         audit.llm_prompt, audit.llm_raw_output, JSON.stringify(audit.gate_results)]
      );

      console.log(`  ✅ ${brief.beginner.headline}`);
      passed++;
      results.push({ date, status: 'passed', headline: brief.beginner.headline });
    } else {
      const failedGates = audit.gate_results.filter(g => !g.passed).map(g => `${g.gate}: ${g.details}`);
      console.log(`  ❌ Held — ${failedGates.join(', ')}`);
      held++;
      results.push({ date, status: 'held', heldReason: failedGates.join('; ') });
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Backfill] Summary:`);
  console.log(`  ${passed} briefs passed all gates`);
  console.log(`  ${held} briefs held`);
  results.forEach(r => {
    console.log(`  ${r.status === 'passed' ? '✅' : '❌'} ${r.date}: ${r.headline || r.heldReason}`);
  });

  await pool.end();
}

backfill();
