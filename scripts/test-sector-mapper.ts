import { mapCompany, aggregateBlockDealsBySector } from '../synthesis/src/sectorScoring/sectorMapper.js';

const t1 = mapCompany('500209', 'Infosys');
console.log('mapCompany(500209, Infosys):', t1, t1 === 'IT' ? '✓' : '✗ EXPECTED IT');

const t2 = mapCompany('500696', 'Hindustan Unilever');
console.log('mapCompany(500696, HUL):', t2, t2 === 'FMCG' ? '✓' : '✗ EXPECTED FMCG');

const t3 = mapCompany('UNKNOWN', 'Random Corp');
console.log('mapCompany(UNKNOWN, Random Corp):', t3, t3 === null ? '✓' : '✗ EXPECTED null');

const t4 = mapCompany('999999', 'HDFC Bank Ltd');
console.log('mapCompany(unknown scrip, HDFC Bank):', t4, t4 === 'BANKING' ? '✓' : '✗ EXPECTED BANKING');

const t5 = mapCompany('999999', 'Tata Steel Ltd');
console.log('mapCompany(unknown scrip, Tata Steel):', t5, t5 === 'METALS' ? '✓' : '✗ EXPECTED METALS');

const deals = [
  { scrip_code: '500209', company: 'Infosys',            type: 'buy',  value_cr: 300 },
  { scrip_code: '532540', company: 'TCS',                type: 'sell', value_cr: 150 },
  { scrip_code: '500180', company: 'HDFC Bank',          type: 'buy',  value_cr: 500 },
  { scrip_code: '500520', company: 'Mahindra & Mahindra',type: 'buy',  value_cr: 200 },
  { scrip_code: 'UNKN',   company: 'Random Corp',        type: 'buy',  value_cr: 999 },
];
const agg = aggregateBlockDealsBySector(deals);

console.log('\naggregateBlockDealsBySector:');
console.log('  IT    buy:', agg.IT.buy_cr, '(300)', agg.IT.buy_cr === 300 ? '✓' : '✗');
console.log('  IT    sell:', agg.IT.sell_cr, '(150)', agg.IT.sell_cr === 150 ? '✓' : '✗');
console.log('  IT    net:', agg.IT.net_cr, '(150)', agg.IT.net_cr === 150 ? '✓' : '✗');
console.log('  BANKING buy:', agg.BANKING.buy_cr, '(500)', agg.BANKING.buy_cr === 500 ? '✓' : '✗');
console.log('  AUTO  buy:', agg.AUTO.buy_cr, '(200)', agg.AUTO.buy_cr === 200 ? '✓' : '✗');
console.log('  Unknown deal ignored:', agg.METALS.net_cr === 0 && agg.FMCG.net_cr === 0 ? '✓' : '✗');
