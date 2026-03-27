import 'dotenv/config';
import { runAllAgents } from '../ingestion/src/agents/runner';
import AGENT_GOALS from '../ingestion/src/agents/goals';

async function test() {
  // Only test with 2 agents to conserve TinyFish steps
  const testAgents = [AGENT_GOALS.fii_dii, AGENT_GOALS.sgx_nifty];

  console.log('[Test] Running 2 agents: fii_dii, sgx_nifty\n');
  const results = await runAllAgents(testAgents);

  console.log('\n[Test] Results:');
  let allValid = true;
  for (const r of results) {
    const hasStatus = ['ok', 'failed', 'partial', 'unavailable'].includes(r.status);
    const hasSignalId = !!r.signal_id;
    const hasSourceUrl = !!r.source_url;
    const hasExtractedAt = !!r.extracted_at;
    const valid = hasStatus && hasSignalId && hasSourceUrl && hasExtractedAt;

    console.log(`  ${valid ? '✅' : '❌'} ${r.signal_id}: status=${r.status}, source_url=${r.source_url ? 'present' : 'MISSING'}`);
    if (!valid) allValid = false;
  }

  console.log(`\n[Test] ${allValid ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  process.exit(allValid ? 0 : 1);
}

test();
