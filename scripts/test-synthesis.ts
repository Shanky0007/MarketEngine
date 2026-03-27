import 'dotenv/config';
import { synthesiseBrief } from '../synthesis/src/synthesiser';
import type { AggregatedSignalsType } from 'shared-types';

const SAMPLE_AGGREGATED: AggregatedSignalsType = {
  date: "2026-03-27",
  generated_at: new Date().toISOString(),
  signals: [
    {
      signal_id: "fii_dii",
      source_url: "https://www.nseindia.com/market-data/fii-dii-activity",
      extracted_at: new Date().toISOString(),
      status: "ok",
      data: {
        fii: { buy: 14823.45, sell: 17291.10, net: -2467.65 },
        dii: { buy: 19104.30, sell: 14200.80, net: 4903.50 },
        unit: "crores INR"
      }
    },
    {
      signal_id: "sgx_nifty",
      source_url: "https://www.google.com/finance/quote/NIFTY_50:INDEXNSE",
      extracted_at: new Date().toISOString(),
      status: "ok",
      data: { price: 22340.50, change_pct: -0.42 }
    },
    {
      signal_id: "usd_inr",
      source_url: "https://www.google.com/finance/quote/USD-INR",
      extracted_at: new Date().toISOString(),
      status: "ok",
      data: { rate: 84.72, change_pct: 0.18 }
    }
  ],
  failed_count: 0,
  ok_count: 3
};

async function test() {
  console.log('[Test] Running synthesiseBrief with sample data...\n');
  const { brief, audit, gatesPassed } = await synthesiseBrief(SAMPLE_AGGREGATED);

  console.log('\n--- Results ---');
  console.log('gatesPassed:', gatesPassed);
  console.log('brief is null:', brief === null);
  console.log('audit.brief_id:', audit.brief_id);
  console.log('audit.held:', audit.held);
  console.log('audit.llm_raw_output length:', audit.llm_raw_output.length);
  console.log('audit.gate_results:', audit.gate_results.map(g => `${g.gate}: ${g.passed}`).join(', '));

  if (!gatesPassed || !brief) {
    console.error('\n❌ Gates failed or brief is null');
    audit.gate_results.filter(g => !g.passed).forEach(g => {
      console.error(`  ${g.gate}: ${g.details}`);
    });
    process.exit(1);
  }

  console.log('\nBeginner headline:', brief.beginner.headline);
  console.log('Body word count:', brief.beginner.body.split(/\s+/).length);
  console.log('Expert signals:', brief.expert.signals.length);
  console.log('Disclaimer present:', !!brief.disclaimer);

  console.log('\n✅ ALL CHECKS PASSED');
}

test();
