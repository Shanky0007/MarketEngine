import 'dotenv/config';
import { alertGateFailure, alertPublishSuccess, alertIngestionFailures } from '../synthesis/src/alerts';
import { randomUUID } from 'crypto';

async function test() {
  const briefId = randomUUID();
  const date = '2026-03-27';

  console.log('[Test] Testing alertGateFailure...');
  await alertGateFailure(briefId, date, [
    { gate: 'prohibited_language', passed: false, details: 'Found prohibited terms: buy, sell' },
    { gate: 'disclaimer_presence', passed: false, details: 'Disclaimer missing or does not match' }
  ]);

  console.log('\n[Test] Testing alertPublishSuccess...');
  await alertPublishSuccess(date, briefId);

  console.log('\n[Test] Testing alertIngestionFailures...');
  await alertIngestionFailures(date, ['sgx_nifty', 'option_chain']);

  console.log('\n✅ ALL ALERT TESTS PASSED');
}

test();
