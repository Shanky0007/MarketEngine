import 'dotenv/config';
import { publishToSubstack } from '../publisher/src/substack';
import { randomUUID } from 'crypto';
import { CANONICAL_DISCLAIMER } from '../synthesis/src/gates';

async function test() {
  const sampleBrief = {
    date: '2026-03-27',
    brief_id: randomUUID(),
    beginner: {
      headline: 'Markets Showed Mixed Signals Across Segments',
      body: 'The Indian markets recorded a mixed session on March 27, 2026. Foreign institutional flows indicated a net outflow of approximately 2,467 crores INR, while domestic institutional participants demonstrated a contrasting stance with net inflows of around 4,903 crores INR.\n\nThe NIFTY 50 index reflected a modest decline of 0.42 percent during the session. Currency markets showed the rupee weakening slightly against the dollar, with the exchange rate moving to 84.72.',
      key_takeaway: 'Domestic institutions offset foreign outflows, keeping markets relatively stable.'
    },
    expert: {
      summary_line: 'FII -2467cr, DII +4903cr; Nifty -0.42%; USD/INR 84.72 (+0.18%)',
      signals: [
        { label: 'FII Net', value: '-2467.65 cr', source: 'NSE', source_url: 'https://www.nseindia.com/market-data/fii-dii-activity', delta: 'outflow', flag: 'caution' as const, flag_reason: 'Significant FII outflow' },
        { label: 'DII Net', value: '+4903.50 cr', source: 'NSE', source_url: 'https://www.nseindia.com/market-data/fii-dii-activity', delta: 'inflow', flag: 'normal' as const },
        { label: 'NIFTY 50', value: '22340.50', source: 'Google Finance', source_url: 'https://www.google.com/finance/quote/NIFTY_50:INDEXNSE', delta: '-0.42%', flag: 'normal' as const },
        { label: 'USD/INR', value: '84.72', source: 'Google Finance', source_url: 'https://www.google.com/finance/quote/USD-INR', delta: '+0.18%', flag: 'normal' as const }
      ],
      anomalies: []
    },
    disclaimer: CANONICAL_DISCLAIMER
  };

  console.log('[Test] Publishing sample brief...\n');
  const result = await publishToSubstack(sampleBrief);

  if (result === null) {
    // Check HTML file was created
    const fs = await import('fs/promises');
    const content = await fs.readFile('./output/brief-2026-03-27.html', 'utf-8');
    const checks = [
      ['Has title', content.includes('Markets Showed Mixed Signals')],
      ['Has disclaimer', content.includes('not a SEBI-registered')],
      ['Has signal table', content.includes('<table>')],
      ['Has source links', content.includes('nseindia.com')],
      ['Has expert summary', content.includes('FII -2467cr')],
      ['Has key takeaway', content.includes('Domestic institutions offset')],
    ];

    console.log('\nHTML file checks:');
    let allPassed = true;
    for (const [name, passed] of checks) {
      console.log(`  ${passed ? '✅' : '❌'} ${name}`);
      if (!passed) allPassed = false;
    }

    console.log(allPassed ? '\n✅ ALL CHECKS PASSED' : '\n❌ SOME CHECKS FAILED');
    process.exit(allPassed ? 0 : 1);
  } else {
    console.log('Published to Substack:', result);
  }
}

test();
