'use client';

import type { SectorScoreType } from 'shared-types';

const SECTOR_NAMES: Record<string, string> = {
  IT:      'Information Technology',
  BANKING: 'Banking & Finance',
  PHARMA:  'Pharmaceuticals',
  AUTO:    'Automobile',
  FMCG:   'Consumer Goods',
  ENERGY:  'Energy & Power',
  METALS:  'Metals & Mining',
};

// Short labels for the circle badge
const SECTOR_SHORT: Record<string, string> = {
  IT:      'IT',
  BANKING: 'BNK',
  PHARMA:  'PHR',
  AUTO:    'AUT',
  FMCG:   'FMC',
  ENERGY:  'ENG',
  METALS:  'MTL',
};

const RUN_LABELS: Record<string, string> = {
  morning:    'Morning',
  midsession: 'Mid-session',
  closing:    'Closing',
};

const TRAFFIC_COLORS = {
  green: {
    dot:    'var(--green)',
    circle: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.22)',
    text:   'var(--green)',
    glow:   'rgba(52,211,153,0.06)',
  },
  amber: {
    dot:    'var(--amber)',
    circle: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.22)',
    text:   'var(--amber)',
    glow:   'rgba(251,191,36,0.06)',
  },
  red: {
    dot:    'var(--red)',
    circle: 'rgba(248,113,113,0.10)',
    border: 'rgba(248,113,113,0.22)',
    text:   'var(--red)',
    glow:   'rgba(248,113,113,0.06)',
  },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface SectorCardProps {
  score: SectorScoreType;
  hasAnomaly?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function SectorCard({ score, hasAnomaly = false, isSelected = false, onSelect }: SectorCardProps) {
  const colors = TRAFFIC_COLORS[score.traffic_light];

  return (
    <div
      className={`relative p-5 rounded-xl transition-all duration-200 ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
      style={{
        background: isSelected
          ? `linear-gradient(145deg, var(--surface-raised), #16161a)`
          : 'linear-gradient(145deg, var(--surface-raised), #111114)',
        border: isSelected
          ? `1px solid ${colors.border}`
          : '1px solid var(--border)',
        boxShadow: isSelected
          ? `0 0 20px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.03)`
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Top row: badge + name + status dot */}
      <div className="flex items-center gap-3 mb-3">
        {/* Sector badge */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: colors.circle, border: `1px solid ${colors.border}` }}
        >
          <span className="text-[11px] font-bold font-data tracking-wide" style={{ color: colors.text }}>
            {SECTOR_SHORT[score.sector] ?? score.sector}
          </span>
        </div>

        {/* Name + run window */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[14px] font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {SECTOR_NAMES[score.sector] ?? score.sector}
          </span>
          <span className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {RUN_LABELS[score.run_window] ?? score.run_window}
          </span>
        </div>

        {/* Status dot */}
        <div className="flex-shrink-0">
          {hasAnomaly ? (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full alert-pulse"
              style={{ background: colors.dot, boxShadow: `0 0 8px ${colors.dot}` }}
            />
          ) : (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: colors.dot }}
            />
          )}
        </div>
      </div>

      {/* Beginner label */}
      <p className="text-[13px] leading-snug mb-3" style={{ color: 'var(--text-secondary)' }}>
        {score.beginner_label}
      </p>

      {/* Footer: time + partial badge */}
      <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="font-data text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {formatTime(score.computed_at)}
        </span>

        <div className="flex items-center gap-2">
          {score.is_partial && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                color: 'var(--amber)',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.18)',
              }}
            >
              Partial
            </span>
          )}

          {/* Expand hint — only when clickable */}
          {onSelect && (
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={isSelected ? colors.text : 'var(--text-muted)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform duration-200"
              style={{ transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export function SectorCardSkeleton() {
  return (
    <div
      className="p-5 rounded-xl animate-pulse"
      style={{ background: 'linear-gradient(145deg, var(--surface-raised), #111114)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg" style={{ background: 'var(--surface-overlay)' }} />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3.5 rounded" style={{ background: 'var(--surface-overlay)', width: '70%' }} />
          <div className="h-2.5 rounded" style={{ background: 'var(--surface-overlay)', width: '40%' }} />
        </div>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--surface-overlay)' }} />
      </div>
      <div className="h-3 rounded mb-3" style={{ background: 'var(--surface-overlay)', width: '80%' }} />
      <div className="pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="h-2.5 rounded" style={{ background: 'var(--surface-overlay)', width: '30%' }} />
      </div>
    </div>
  );
}
