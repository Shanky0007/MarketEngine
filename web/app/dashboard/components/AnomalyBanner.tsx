'use client';

import { useState } from 'react';
import type { AnomalyEventType } from 'shared-types';

const ANOMALY_LABELS: Record<string, string> = {
  consecutive_fii_sell:    'FII Sell Streak',
  pcr_threshold_breach:    'PCR Breach',
  score_reversal:          'Score Reversal',
  large_block_deal:        'Large Block Deal',
  dii_absorption_failure:  'DII Absorption Failure',
  sector_divergence:       'Sector Divergence',
};

interface AnomalyBannerProps {
  anomalies: AnomalyEventType[];
  onScrollToSector?: (sector: string) => void;
}

export default function AnomalyBanner({ anomalies, onScrollToSector }: AnomalyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (anomalies.length === 0 || dismissed) return null;

  // Sort: HIGH first, then MEDIUM
  const sorted = [...anomalies].sort((a, b) => {
    if (a.severity === 'HIGH' && b.severity !== 'HIGH') return -1;
    if (a.severity !== 'HIGH' && b.severity === 'HIGH') return 1;
    return 0;
  });

  const primary = sorted[0];
  const hasHigh = sorted.some(a => a.severity === 'HIGH');
  const remaining = sorted.slice(1);

  const dotColor = hasHigh ? 'var(--red)' : 'var(--amber)';
  const borderColor = hasHigh ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.25)';
  const bgColor = hasHigh ? 'rgba(248,113,113,0.05)' : 'rgba(251,191,36,0.05)';
  const labelColor = hasHigh ? 'var(--red)' : 'var(--amber)';

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Primary alert row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Pulsing dot + label */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <span
            className={`inline-block w-2 h-2 rounded-full ${hasHigh ? 'alert-pulse' : ''}`}
            style={{ background: dotColor, boxShadow: hasHigh ? `0 0 6px ${dotColor}` : undefined }}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: labelColor }}>
            Alert
          </span>
        </div>

        {/* Alert content */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="text-[13px] leading-snug" style={{ color: 'var(--text-primary)' }}>
            {primary.alert_text}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Historical pattern data only. Not financial advice.
          </p>
        </div>

        {/* Right side: view details + dismiss */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => onScrollToSector?.(primary.sector)}
            className="text-[12px] font-medium transition-colors duration-150 whitespace-nowrap"
            style={{ color: 'var(--gold-dim)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}
          >
            View details &darr;
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md transition-colors duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            aria-label="Dismiss alert"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* "+N more alerts" expandable section */}
      {remaining.length > 0 && (
        <>
          <div className="px-4 pb-2">
            <button
              onClick={() => setExpanded(prev => !prev)}
              className="text-[12px] font-medium transition-colors duration-150 flex items-center gap-1"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              +{remaining.length} more alert{remaining.length > 1 ? 's' : ''}
            </button>
          </div>

          {expanded && (
            <div className="flex flex-col" style={{ borderTop: `1px solid ${borderColor}` }}>
              {remaining.map((a, i) => {
                const isHigh = a.severity === 'HIGH';
                return (
                  <div
                    key={`${a.sector}-${a.anomaly_type}-${i}`}
                    className="flex items-start gap-3 px-4 py-2.5"
                    style={{ borderBottom: i < remaining.length - 1 ? `1px solid ${borderColor}` : undefined }}
                  >
                    <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${isHigh ? 'alert-pulse' : ''}`}
                        style={{ background: isHigh ? 'var(--red)' : 'var(--amber)' }}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isHigh ? 'var(--red)' : 'var(--amber)' }}>
                        {a.severity}
                      </span>
                    </div>

                    <p className="text-[12px] leading-snug flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>
                      {a.alert_text}
                    </p>

                    <button
                      onClick={() => onScrollToSector?.(a.sector)}
                      className="text-[11px] font-medium transition-colors duration-150 flex-shrink-0"
                      style={{ color: 'var(--gold-dim)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}
                    >
                      {a.sector} &darr;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
