'use client';

import { useState, useEffect } from 'react';
import SignalTable from './SignalTable';
import Disclaimer from './Disclaimer';
import JargonText from './JargonText';

type BriefData = {
  brief_date: string;
  beginner_headline: string;
  beginner_body: string;
  beginner_takeaway: string;
  expert_summary: string;
  expert_signals: any[];
  expert_anomalies: string[];
  disclaimer: string;
};

export default function BriefCard({ brief }: { brief: BriefData }) {
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');

  useEffect(() => {
    const saved = localStorage.getItem('mse-reading-level');
    if (saved === 'simple' || saved === 'detailed') setMode(saved);
  }, []);

  const toggle = (m: 'simple' | 'detailed') => {
    setMode(m);
    localStorage.setItem('mse-reading-level', m);
  };

  return (
    <article className="card-brief p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-data text-[12px] font-medium text-[var(--gold)] bg-[var(--gold)]/10 px-3.5 py-2 rounded-md border border-[var(--gold)]/20">
            {brief.brief_date}
          </span>
          <span className="label">Daily Brief</span>
        </div>
        <h2 className="text-[28px] font-bold text-[var(--text-primary)] leading-[1.2] tracking-[-0.02em]">
          {brief.beginner_headline}
        </h2>
      </div>

      {/* Disclaimer */}
      <div className="mb-6">
        <Disclaimer text={brief.disclaimer} />
      </div>

      {/* Segmented Toggle */}
      <div className="mb-8">
        <div className="toggle-container">
          <button
            onClick={() => toggle('simple')}
            className={`toggle-option ${mode === 'simple' ? 'toggle-active' : 'toggle-inactive'}`}
          >
            <span className="text-[14px]">📖</span> Beginner
          </button>
          <button
            onClick={() => toggle('detailed')}
            className={`toggle-option ${mode === 'detailed' ? 'toggle-active' : 'toggle-inactive'}`}
          >
            <span className="text-[14px]">📊</span> Expert
          </button>
        </div>
      </div>

      {/* Beginner Mode */}
      {mode === 'simple' && (
        <div>
          <div className="space-y-6">
            {brief.beginner_body.split('\n\n').map((p, i) => (
              <p key={i} className="text-[15px] leading-[1.8] text-[var(--text-primary)]">
                <JargonText text={p} />
              </p>
            ))}
          </div>

          <div className="card-inset p-5 mt-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[var(--gold)] text-[14px]">💡</span>
              <span className="label">Key Takeaway</span>
            </div>
            <p className="text-[15px] font-medium text-[var(--text-primary)] leading-[1.6]">{brief.beginner_takeaway}</p>
          </div>
        </div>
      )}

      {/* Expert Mode */}
      {mode === 'detailed' && (
        <div>
          <div className="card-inset p-5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[var(--gold)] text-[14px]">⚡</span>
              <span className="label">Summary</span>
            </div>
            <p className="font-data text-[13px] text-[var(--text-primary)]">{brief.expert_summary}</p>
          </div>

          <div className="mb-6">
            <span className="label block mb-3">Signal Dashboard</span>
            <SignalTable signals={brief.expert_signals} />
          </div>

          {brief.expert_anomalies.length > 0 && (
            <div className="card-inset p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[var(--red)] text-[14px]">🔴</span>
                <span className="label">Anomalies Detected</span>
              </div>
              <ul className="space-y-2">
                {brief.expert_anomalies.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                    <span className="text-[var(--red)] mt-0.5">•</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Bottom divider + disclaimer */}
      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{brief.disclaimer}</p>
      </div>
    </article>
  );
}
