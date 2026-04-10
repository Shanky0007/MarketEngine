'use client';

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { SectorScoreType, AnomalyEventType } from 'shared-types';
import SectorCard, { SectorCardSkeleton } from './SectorCard';
import SignalTable from './SignalTable';

export interface SectorGridHandle {
  selectSector: (sector: string) => void;
}

interface SectorGridProps {
  scores: SectorScoreType[];
  anomalies: AnomalyEventType[];
  loading?: boolean;
  expandable?: boolean;
}

const SECTOR_ORDER = ['BANKING', 'IT', 'ENERGY', 'AUTO', 'FMCG', 'PHARMA', 'METALS'] as const;

const SectorGrid = forwardRef<SectorGridHandle, SectorGridProps>(function SectorGrid(
  { scores, anomalies, loading = false, expandable = true },
  ref
) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    selectSector(sector: string) {
      setSelectedSector(sector);
    },
  }));

  // Scroll detail panel into view when a sector is selected
  useEffect(() => {
    if (selectedSector && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedSector]);

  const anomalySectors = new Set(anomalies.map(a => a.sector));

  const sorted = SECTOR_ORDER
    .map(s => scores.find(r => r.sector === s))
    .filter(Boolean) as SectorScoreType[];

  const extra = scores.filter(r => !SECTOR_ORDER.includes(r.sector as typeof SECTOR_ORDER[number]));
  const allScores = [...sorted, ...extra];

  // Build per-sector latest anomaly lookup
  const anomalyBySector = new Map<string, AnomalyEventType>();
  for (const a of anomalies) {
    if (!anomalyBySector.has(a.sector)) {
      anomalyBySector.set(a.sector, a);
    }
  }

  const selectedScore = allScores.find(s => s.sector === selectedSector) ?? null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {SECTOR_ORDER.map(s => <SectorCardSkeleton key={s} />)}
      </div>
    );
  }

  if (allScores.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl"
        style={{ color: 'var(--text-muted)', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <p className="text-[14px]">Data temporarily unavailable — pipeline is running.</p>
        <p className="text-[12px]">Check back in 15 minutes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {allScores.map(score => (
          <SectorCard
            key={score.sector}
            score={score}
            hasAnomaly={anomalySectors.has(score.sector)}
            isSelected={expandable && selectedSector === score.sector}
            onSelect={expandable ? () => setSelectedSector(prev => prev === score.sector ? null : score.sector) : undefined}
          />
        ))}
      </div>

      {/* Full-width detail panel below the grid (Detailed mode only) */}
      {expandable && selectedScore && (
        <div ref={detailRef} className="flex flex-col items-center gap-0">
          {/* Arrow connector */}
          <div
            className="w-3 h-3 rotate-45 -mb-1.5 z-10"
            style={{ background: 'var(--surface-raised)', borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}
          />
          <div
            className="w-full rounded-xl p-6"
            style={{
              background: 'linear-gradient(145deg, var(--surface-raised), #111114)',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <SignalTable
              sector={selectedScore.sector}
              score={selectedScore}
              latestAnomaly={anomalyBySector.get(selectedScore.sector) ?? null}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default SectorGrid;
