'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { SectorScoreType, AnomalyEventType } from 'shared-types';
import SectorGrid, { type SectorGridHandle } from './SectorGrid';
import AnomalyBanner from './AnomalyBanner';

const POLL_INTERVAL_MS = 60_000;

interface LiveDashboardProps {
  initialScores: SectorScoreType[];
  initialAnomalies: AnomalyEventType[];
}

export default function LiveDashboard({ initialScores, initialAnomalies }: LiveDashboardProps) {
  const [scores, setScores] = useState(initialScores);
  const [anomalies, setAnomalies] = useState(initialAnomalies);
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    if (initialScores.length === 0) return null;
    return new Date(Math.max(...initialScores.map(s => new Date(s.computed_at).getTime())));
  });
  const gridRef = useRef<SectorGridHandle>(null);

  // Restore reading level from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mse-reading-level');
    if (saved === 'simple' || saved === 'detailed') setMode(saved);
  }, []);

  const toggleMode = (m: 'simple' | 'detailed') => {
    setMode(m);
    localStorage.setItem('mse-reading-level', m);
  };

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/scores');
      if (!res.ok) return;
      const data = await res.json();

      if (data.scores?.length > 0) {
        setScores(data.scores);
        setLastUpdated(new Date(Math.max(...data.scores.map((s: SectorScoreType) => new Date(s.computed_at).getTime()))));
      }
      if (data.anomalies) {
        setAnomalies(data.anomalies);
      }
    } catch {
      // Silently ignore — will retry on next interval
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLatest, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLatest]);

  const handleScrollToSector = useCallback((sector: string) => {
    // Switch to detailed mode so the signal table is visible
    setMode('detailed');
    localStorage.setItem('mse-reading-level', 'detailed');
    gridRef.current?.selectSector(sector);
  }, []);

  // Pipeline active if last run was < 30 min ago
  const pipelineActive = lastUpdated
    ? (Date.now() - lastUpdated.getTime()) < 30 * 60 * 1000
    : false;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Sector Pulse
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Institutional flow intelligence &middot; 7 sectors &middot; Updated 3&times; daily
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Timestamp + pipeline status */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="font-data text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${pipelineActive ? 'pulse-dot' : ''}`}
                style={{ background: pipelineActive ? 'var(--green)' : 'var(--text-muted)' }}
              />
              <span className="text-[11px] font-medium" style={{ color: pipelineActive ? 'var(--green)' : 'var(--text-muted)' }}>
                {pipelineActive ? 'Pipeline Active' : 'Pipeline Idle'}
              </span>
            </div>
          </div>

          {/* Reading level toggle */}
          <div className="toggle-container">
            <button
              onClick={() => toggleMode('simple')}
              className={`toggle-option ${mode === 'simple' ? 'toggle-active' : 'toggle-inactive'}`}
            >
              Simple
            </button>
            <button
              onClick={() => toggleMode('detailed')}
              className={`toggle-option ${mode === 'detailed' ? 'toggle-active' : 'toggle-inactive'}`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Anomaly banner */}
      <AnomalyBanner anomalies={anomalies} onScrollToSector={handleScrollToSector} />

      {/* Sector grid */}
      <SectorGrid
        ref={gridRef}
        scores={scores}
        anomalies={anomalies}
        expandable={mode === 'detailed'}
      />
    </>
  );
}
