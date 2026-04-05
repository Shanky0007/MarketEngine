'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'niftea_score_disclaimer_v1';
const COUNTDOWN_SECONDS = 3;

export default function ScoreDisclaimer() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [ready, setReady] = useState(false);

  // Only show if not previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  // Countdown timer — only runs when modal is visible
  useEffect(() => {
    if (!visible) return;

    if (countdown <= 0) {
      setReady(true);
      return;
    }

    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, countdown]);

  function handleDismiss() {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(13,13,15,0.92)', backdropFilter: 'blur(12px)' }}
      // No click-outside dismiss — button is the only exit
    >
      <div
        className="card-skeuo w-full max-w-[560px] p-8 flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
      >
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 7a.875.875 0 110-1.75.875.875 0 010 1.75z"
                  fill="var(--amber)" />
              </svg>
            </div>
            <h2
              id="disclaimer-title"
              className="text-[18px] font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Before you use Sector Pulse
            </h2>
          </div>
          <div className="h-px mt-1" style={{ background: 'var(--border)' }} />
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 text-[14px] leading-[1.75]" style={{ color: 'var(--text-secondary)' }}>
          <p>
            Sector scores reflect institutional flow data extracted from public market sources
            (NSE, BSE, SEBI, AMFI). A score of 80 means institutional money has been flowing
            into that sector recently.
          </p>

          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)' }}
          >
            <p style={{ color: 'var(--red)' }} className="font-medium text-[13px]">
              A high score does <span className="underline underline-offset-2">not</span> mean the sector will go up.
            </p>
            <p style={{ color: 'var(--red)' }} className="font-medium text-[13px]">
              A low score does <span className="underline underline-offset-2">not</span> mean the sector will go down.
            </p>
          </div>

          <p>
            These scores describe what institutional investors <em>have been doing</em>,
            not what you should do. Past institutional flow patterns do not reliably predict
            future price movements.
          </p>

          <p
            className="text-[13px] pt-1 pb-1 px-3 rounded-lg"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--surface-overlay)',
              borderLeft: '3px solid var(--border-light)'
            }}
          >
            Niftea is not a SEBI-registered investment adviser. This dashboard is for
            informational purposes only. Never make investment decisions based solely on
            this content.
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          disabled={!ready}
          className="w-full h-12 rounded-xl text-[14px] font-semibold tracking-wide transition-all duration-200"
          style={ready ? {
            background: 'linear-gradient(135deg, var(--gold), var(--gold-dim))',
            color: '#0d0d0f',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
          } : {
            background: 'var(--surface-overlay)',
            color: 'var(--text-muted)',
            cursor: 'not-allowed',
            border: '1px solid var(--border)',
          }}
          aria-live="polite"
        >
          {ready
            ? 'I understand — show me the dashboard'
            : `I understand (${countdown})`}
        </button>
      </div>
    </div>
  );
}
