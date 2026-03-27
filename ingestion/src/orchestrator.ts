import { runAllAgents } from './agents/runner';
import AGENT_GOALS from './agents/goals';
import type { AggregatedSignalsType } from 'shared-types';

export async function runIngestion(): Promise<AggregatedSignalsType> {
  const agents = Object.values(AGENT_GOALS);
  const signals = await runAllAgents(agents);

  const okCount = signals.filter(s => s.status === 'ok').length;
  const failedCount = signals.filter(s => s.status !== 'ok').length;

  // Log summary
  console.log('[Orchestrator] Ingestion summary:');
  for (const s of signals) {
    const icon = s.status === 'ok' ? '✅' : s.status === 'unavailable' ? '⚠️' : '❌';
    console.log(`  ${icon} ${s.signal_id}: ${s.status}`);
  }

  return {
    date: new Date().toISOString().split('T')[0],
    generated_at: new Date().toISOString(),
    signals,
    failed_count: failedCount,
    ok_count: okCount
  };
}
