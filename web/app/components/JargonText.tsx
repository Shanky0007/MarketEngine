'use client';

const JARGON: Record<string, string> = {
  'FII': 'Foreign Institutional Investors — overseas funds trading in Indian markets',
  'FIIs': 'Foreign Institutional Investors — overseas funds trading in Indian markets',
  'DII': 'Domestic Institutional Investors — Indian mutual funds, insurance companies',
  'DIIs': 'Domestic Institutional Investors — Indian mutual funds, insurance companies',
  'PCR': 'Put-Call Ratio — measures market sentiment via options activity',
  'NIFTY': 'NIFTY 50 — benchmark index of top 50 NSE-listed companies',
  'BANKNIFTY': 'Bank NIFTY — index tracking major banking stocks',
  'MCX': 'Multi Commodity Exchange — India\'s commodity trading platform',
  'SGX': 'Singapore Exchange — trades NIFTY futures internationally',
  'ATM IV': 'At-The-Money Implied Volatility — expected price movement',
  'Max Pain': 'Strike price where most options expire worthless',
};

export default function JargonText({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < words.length) {
    const word = words[i];
    const cleanWord = word.replace(/[.,;:!?()]/g, '');
    const definition = JARGON[cleanWord];

    if (definition) {
      const prefix = word.match(/^[.,;:!?()]*/)?.[0] || '';
      const suffix = word.match(/[.,;:!?()]*$/)?.[0] || '';
      elements.push(
        <span key={i}>
          {prefix}
          <span className="jargon-term">
            {cleanWord}
            <span className="jargon-tip">{definition}</span>
          </span>
          {suffix}
        </span>
      );
    } else {
      elements.push(<span key={i}>{word}</span>);
    }
    i++;
  }

  return <>{elements}</>;
}
