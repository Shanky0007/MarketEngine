import 'dotenv/config';
import AGENT_GOALS from '../ingestion/src/agents/goals';
import { AggregatedSignals } from 'shared-types';

// Mock test — validates structure without calling TinyFish
async function test() {
  const agents = Object.values(AGENT_GOALS);

  // Simulate what runIngestion returns
  const mockSignals = agents.map(a => ({
    signal_id: a.signal_id,
    source_url: a.url,
    extracted_at: new Date().toISOString(),
    status: 'ok' as const,
    data: { mock: true }
  }));

  const result = {
    date: new Date().toISOString().split('T')[0],
    generated_at: new Date().toISOString(),
    signals: mockSignals,
    failed_count: 0,
    ok_count: agents.length
  };

  // Validate against Zod schema
  const parsed = AggregatedSignals.safeParse(result);

  if (!parsed.success) {
    console.error('❌ Schema validation failed:', parsed.error.format());
    process.exit(1);
  }

  console.log('✅ AggregatedSignals schema valid');
  console.log(`✅ ${parsed.data.signals.length} signals (expected 12)`);
  console.log(`✅ ok_count: ${parsed.data.ok_count}`);
  console.log(`✅ date: ${parsed.data.date}`);
  console.log(`✅ generated_at: ${parsed.data.generated_at}`);

  const ids = parsed.data.signals.map(s => s.signal_id);
  console.log(`✅ Signal IDs: ${ids.join(', ')}`);

  if (ids.length !== 12) {
    console.error(`❌ Expected 12 signals, got ${ids.length}`);
    process.exit(1);
  }

  console.log('\n✅ ALL TESTS PASSED');
}

test();
