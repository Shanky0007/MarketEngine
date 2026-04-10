'use client';

import { useState } from 'react';
import type { SectorScoreType, AnomalyEventType, SectorIdType } from 'shared-types';

const SECTOR_NAMES: Record<string, string> = {
  IT:      'Information Technology',
  BANKING: 'Banking & Finance',
  PHARMA:  'Pharmaceuticals',
  AUTO:    'Automobile',
  FMCG:   'Consumer Goods',
  ENERGY:  'Energy & Power',
  METALS:  'Metals & Mining',
};

const SIGNAL_ROWS: {
  key: keyof SectorScoreType['signal_breakdown'];
  label: string;
  source: string;
  sourceUrl: string;
  weight: string;
  format: (v: number) => string;
  flagCheck?: (v: number) => string | null;
}[] = [
  {
    key: 'fii_net_cr',
    label: 'FII net equity',
    source: 'NSE',
    sourceUrl: 'https://www.nseindia.com/market-data/fii-dii-activity',
    weight: '35%',
    format: v => `${v >= 0 ? '+' : ''}${v.toLocaleString('en-IN')} Cr`,
  },
  {
    key: 'dii_net_cr',
    label: 'DII net equity',
    source: 'NSE',
    sourceUrl: 'https://www.nseindia.com/market-data/fii-dii-activity',
    weight: '20%',
    format: v => `${v >= 0 ? '+' : ''}${v.toLocaleString('en-IN')} Cr`,
  },
  {
    key: 'pcr',
    label: 'Put-Call Ratio',
    source: 'NSE Option Chain',
    sourceUrl: 'https://www.nseindia.com/option-chain',
    weight: '25%',
    format: v => v.toFixed(2),
    flagCheck: v => {
      if (v < 0.65) return 'PCR below 0.65 — extreme bearish sentiment';
      if (v > 1.6) return 'PCR above 1.6 — extreme put buying';
      return null;
    },
  },
  {
    key: 'block_deal_net_cr',
    label: 'Block deals net',
    source: 'BSE',
    sourceUrl: 'https://www.bseindia.com/markets/equity/EQReports/bulk_deals.aspx',
    weight: '10%',
    format: v => `${v >= 0 ? '+' : ''}${v.toLocaleString('en-IN')} Cr`,
  },
  {
    key: 'mf_inflow_cr',
    label: 'MF sector inflow',
    source: 'AMFI',
    sourceUrl: 'https://www.amfiindia.com/net-data-dated-fund-activity',
    weight: '10%',
    format: v => `${v >= 0 ? '+' : ''}${v.toLocaleString('en-IN')} Cr`,
  },
];

interface SignalTableProps {
  sector: SectorIdType;
  score: SectorScoreType;
  latestAnomaly: AnomalyEventType | null;
}

export default function SignalTable({ sector, score, latestAnomaly }: SignalTableProps) {
  const [showWeights, setShowWeights] = useState(false);
  const breakdown = score.signal_breakdown;

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex flex-col gap-2">
        <h3
          className="text-[15px] font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Signal breakdown — {SECTOR_NAMES[sector] ?? sector}
        </h3>

        {/* Score explanation line */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-data text-[14px]" style={{ color: 'var(--text-primary)' }}>
            Score: {score.score} / 100
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            — weighted composite of 5 signals
          </span>
          <button
            onClick={() => setShowWeights(true)}
            className="text-[12px] underline underline-offset-2 decoration-dotted transition-colors duration-150"
            style={{ color: 'var(--gold-dim)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}
          >
            How is this calculated?
          </button>
        </div>
      </div>

      {/* Partial data banner */}
      {score.is_partial && (
        <div
          className="text-[12px] font-medium px-3 py-2 rounded-lg"
          style={{
            color: 'var(--amber)',
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          Partial data — {breakdown.data_completeness}/5 signals available for this update
        </div>
      )}

      {/* Signal table */}
      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Signal</th>
              <th className="text-right py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Value</th>
              <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Source</th>
              <th className="text-center py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Weight</th>
              <th className="text-center py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Flag</th>
            </tr>
          </thead>
          <tbody>
            {SIGNAL_ROWS.map((row, i) => {
              const rawValue = breakdown[row.key];
              const isNull = rawValue === null || rawValue === undefined;
              const numValue = isNull ? 0 : (rawValue as number);
              const flagReason = !isNull && row.flagCheck ? row.flagCheck(numValue) : null;

              return (
                <tr
                  key={row.key}
                  style={{
                    background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-raised)',
                    borderBottom: i < SIGNAL_ROWS.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  {/* Signal label */}
                  <td className="py-2.5 px-3 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {row.label}
                  </td>

                  {/* Value */}
                  <td className="py-2.5 px-3 text-right font-data text-[13px]">
                    {isNull ? (
                      <span className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>
                        [unavailable — verify at source]
                      </span>
                    ) : (
                      <span style={{ color: row.key === 'pcr' ? 'var(--text-primary)' : (numValue >= 0 ? 'var(--green)' : 'var(--red)') }}>
                        {row.key !== 'pcr' && (numValue >= 0 ? '↑ ' : '↓ ')}
                        {row.format(numValue)}
                      </span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="py-2.5 px-3">
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link inline-flex items-center gap-1 text-[11px] transition-colors duration-150"
                      style={{ color: 'var(--gold-dim)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}
                    >
                      {row.source}
                      <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </td>

                  {/* Weight */}
                  <td className="py-2.5 px-3 text-center font-data text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {row.weight}
                  </td>

                  {/* Flag */}
                  <td className="py-2.5 px-3 text-center">
                    {isNull ? (
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--text-muted)' }} title="Data unavailable" />
                    ) : flagReason ? (
                      <span className="inline-block w-2 h-2 rounded-full alert-pulse" style={{ background: 'var(--red)' }} title={flagReason} />
                    ) : (
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Anomaly panel */}
      {latestAnomaly && (
        <div
          className="rounded-lg p-4 flex flex-col gap-2"
          style={{
            background: latestAnomaly.severity === 'HIGH'
              ? 'rgba(248,113,113,0.06)'
              : 'rgba(251,191,36,0.06)',
            border: `1px solid ${latestAnomaly.severity === 'HIGH'
              ? 'rgba(248,113,113,0.2)'
              : 'rgba(251,191,36,0.2)'}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full alert-pulse"
              style={{ background: latestAnomaly.severity === 'HIGH' ? 'var(--red)' : 'var(--amber)' }}
            />
            <span
              className="text-[12px] font-semibold uppercase tracking-wider"
              style={{ color: latestAnomaly.severity === 'HIGH' ? 'var(--red)' : 'var(--amber)' }}
            >
              {latestAnomaly.severity} — {latestAnomaly.anomaly_type.replace(/_/g, ' ')}
            </span>
          </div>

          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {latestAnomaly.alert_text}
          </p>

          {latestAnomaly.historical_context && (
            <p className="text-[13px] leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
              {latestAnomaly.historical_context}
            </p>
          )}

          <p className="text-[11px] leading-relaxed mt-1" style={{ color: 'var(--text-muted)' }}>
            {latestAnomaly.disclaimer}
          </p>
        </div>
      )}

      {/* Weights modal */}
      {showWeights && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(13,13,15,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowWeights(false)}
        >
          <div
            className="card-skeuo w-full max-w-[400px] p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              How is the score calculated?
            </h4>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Each sector score is a weighted average of 5 institutional flow signals,
              normalised to 0–100. The weights are:
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'FII net equity', weight: '35%' },
                { label: 'Put-Call Ratio', weight: '25%' },
                { label: 'DII net equity', weight: '20%' },
                { label: 'Block deals net', weight: '10%' },
                { label: 'MF sector inflow', weight: '10%' },
              ].map(w => (
                <div key={w.label} className="flex items-center justify-between py-1.5 px-3 rounded-md"
                  style={{ background: 'var(--surface-overlay)' }}>
                  <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{w.label}</span>
                  <span className="font-data text-[13px] font-semibold" style={{ color: 'var(--gold)' }}>{w.weight}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              If a signal is unavailable, its weight is redistributed proportionally
              to the remaining signals. Scores are deterministic — not AI-generated.
            </p>
            <button
              onClick={() => setShowWeights(false)}
              className="w-full h-10 rounded-lg text-[13px] font-medium transition-colors duration-150"
              style={{ background: 'var(--surface-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
