'use client';

const TICKERS = [
  'NIFTY 50', 'FII NET', 'DII NET', 'PCR', 'USD/INR',
  'BRENT CRUDE', 'BANKNIFTY', 'GOLD MCX', 'DOW JONES', 'NASDAQ',
  'NIKKEI 225', 'HANG SENG'
];

export default function TickerStrip() {
  const items = [...TICKERS, ...TICKERS]; // duplicate for seamless loop

  return (
    <div className="overflow-hidden border-y border-[var(--border)] py-3">
      <div className="ticker-strip flex whitespace-nowrap">
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center mx-6">
            <span className="font-data text-[12px] tracking-wider text-[var(--gold)]">{t}</span>
            <span className="mx-6 text-[var(--border)]">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
