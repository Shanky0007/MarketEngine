'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { SectorScoreType, AnomalyEventType } from 'shared-types';
import type { DataSource } from '../../../lib/sectorData';
import SectorGrid, { type SectorGridHandle } from './SectorGrid';
import AnomalyBanner from './AnomalyBanner';

const POLL_INTERVAL_MS = 60_000;

interface LiveDashboardProps {
  initialScores: SectorScoreType[];
  initialAnomalies: AnomalyEventType[];
  initialSource: DataSource;
}

export default function LiveDashboard({ initialScores, initialAnomalies, initialSource }: LiveDashboardProps) {
  const [scores, setScores] = useState(initialScores);
  const [anomalies, setAnomalies] = useState(initialAnomalies);
  const [source, setSource] = useState<DataSource>(initialSource);
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

      if (data.source) setSource(data.source as DataSource);
      if (data.scores?.length > 0) {
        setScores(data.scores);
        setLastUpdated(new Date(Math.max(...data.scores.map((s: SectorScoreType) => new Date(s.computed_at).getTime()))));
      } else {
        setScores([]);
        setLastUpdated(null);
      }
      setAnomalies(data.anomalies ?? []);
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

      {/* Data-source banner — surfaces non-live states instead of silently faking data */}
      {source !== 'live' && (
        <div
          className="rounded-lg px-4 py-3 text-[13px] leading-relaxed"
          style={{
            border: '1px solid var(--border)',
            background: 'rgba(251,191,36,0.06)',
            color: 'var(--text-muted)',
          }}
        >
          {source === 'empty' && (
            <>
              <strong style={{ color: 'var(--text-primary)' }}>No scores yet.</strong>{' '}
              The pipeline hasn&apos;t produced data. Scores appear after the next scheduled run
              (morning / mid-session / closing on trading days).
            </>
          )}
          {source === 'error' && (
            <>
              <strong style={{ color: 'var(--text-primary)' }}>Data temporarily unavailable.</strong>{' '}
              Could not reach the scores database. Retrying automatically.
            </>
          )}
          {source === 'mock' && (
            <>
              <strong style={{ color: 'var(--text-primary)' }}>Demo data.</strong>{' '}
              Showing sample values (<code>USE_MOCK_DATA</code> is on) — not live market data.
            </>
          )}
        </div>
      )}

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
