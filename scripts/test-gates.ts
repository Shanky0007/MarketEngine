import { runGate1ProhibitedLanguage, runGate2SourceCompleteness, runGate3DisclaimerPresence, runAllGates, CANONICAL_DISCLAIMER } from '../synthesis/src/gates';
import type { BriefOutputType } from 'shared-types';
import { randomUUID } from 'crypto';

function makeBrief(overrides: Partial<any> = {}): BriefOutputType {
  return {
    date: '2026-03-27',
    brief_id: randomUUID(),
    beginner: {
      headline: overrides.headline ?? 'Markets showed mixed signals today',
      body: overrides.body ?? 'The market recorded mixed activity across segments.',
      key_takeaway: overrides.takeaway ?? 'Mixed signals across the board.'
    },
    expert: {
      summary_line: overrides.summary ?? 'FII outflow, DII inflow, Nifty flat.',
      signals: overrides.signals ?? [
        { label: 'FII Net', value: '-2467 cr', source: 'NSE', source_url: 'https://nseindia.com/fii', delta: '-', flag: 'normal' as const },
        { label: 'DII Net', value: '+4903 cr', source: 'NSE', source_url: 'https://nseindia.com/dii', delta: '+', flag: 'normal' as const }
      ],
      anomalies: overrides.anomalies ?? []
    },
    disclaimer: overrides.disclaimer ?? CANONICAL_DISCLAIMER
  };
}

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    failed++;
  }
}

// --- GATE 1: Prohibited Language ---
console.log('\nGATE 1 — Prohibited Language');

const g1clean = runGate1ProhibitedLanguage(makeBrief());
assert('Clean brief passes', g1clean.passed === true);

const g1buy = runGate1ProhibitedLanguage(makeBrief({ headline: 'You should buy IT stocks now' }));
assert('Detects "should buy" advisory phrase', g1buy.passed === false);

const g1sell = runGate1ProhibitedLanguage(makeBrief({ body: 'You must sell your holdings immediately.' }));
assert('Detects "must sell" advisory phrase', g1sell.passed === false);

const g1willrise = runGate1ProhibitedLanguage(makeBrief({ takeaway: 'Nifty will rise tomorrow.' }));
assert('Detects "will rise" in takeaway', g1willrise.passed === false);

const g1recommend = runGate1ProhibitedLanguage(makeBrief({ summary: 'We recommend caution on banking stocks.' }));
assert('Detects "we recommend" in summary', g1recommend.passed === false);

const g1anomaly = runGate1ProhibitedLanguage(makeBrief({ anomalies: ['Price target breached for HDFC'] }));
assert('Detects "price target" in anomalies', g1anomaly.passed === false);

const g1descriptive = runGate1ProhibitedLanguage(makeBrief({ body: 'FIIs recorded net selling of 2467 crores. DIIs showed buying activity of 4903 crores.' }));
assert('Allows descriptive "selling/buying" (not advisory)', g1descriptive.passed === true);

// --- GATE 2: Source Completeness ---
console.log('\nGATE 2 — Source Completeness');

const g2clean = runGate2SourceCompleteness(makeBrief());
assert('All signals with URLs passes', g2clean.passed === true);

const g2missing = runGate2SourceCompleteness(makeBrief({
  signals: [
    { label: 'FII Net', value: '-2467 cr', source: 'NSE', source_url: 'https://nseindia.com/fii', delta: '-', flag: 'normal' },
    { label: 'DII Net', value: '+4903 cr', source: 'NSE', source_url: '', delta: '+', flag: 'normal' }
  ]
}));
assert('Detects empty source_url', g2missing.passed === false);

const g2nourl = runGate2SourceCompleteness(makeBrief({
  signals: [
    { label: 'USD/INR', value: '84.72', source: 'RBI', source_url: '', delta: '+0.18%', flag: 'normal' }
  ]
}));
assert('Detects missing source_url on single signal', g2nourl.passed === false);

// --- GATE 3: Disclaimer Presence ---
console.log('\nGATE 3 — Disclaimer Presence');

const g3clean = runGate3DisclaimerPresence(makeBrief());
assert('Correct disclaimer passes', g3clean.passed === true);

const g3wrong = runGate3DisclaimerPresence(makeBrief({ disclaimer: 'This is not financial advice.' }));
assert('Detects wrong disclaimer text', g3wrong.passed === false);

const g3empty = runGate3DisclaimerPresence(makeBrief({ disclaimer: '' }));
assert('Detects empty disclaimer', g3empty.passed === false);

// --- ALL GATES TOGETHER ---
console.log('\nALL GATES — Combined');

const allClean = runAllGates(makeBrief());
assert('Clean brief passes all gates', allClean.allPassed === true);

const allBad = runAllGates(makeBrief({
  headline: 'You should buy stocks',
  signals: [{ label: 'X', value: '1', source: 'Y', source_url: '', delta: '0', flag: 'normal' }],
  disclaimer: 'wrong'
}));
assert('Bad brief fails all three gates', allBad.allPassed === false && allBad.results.every(r => !r.passed));

// --- SUMMARY ---
console.log(`\n${'='.repeat(40)}`);
console.log(`${passed} passed, ${failed} failed`);
console.log(failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
process.exit(failed === 0 ? 0 : 1);
