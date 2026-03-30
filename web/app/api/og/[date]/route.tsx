import { ImageResponse } from 'next/og';
import { getBriefByDate } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const brief = await getBriefByDate(date);

  if (!brief) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#111', color: '#666', fontSize: 32 }}>
          Brief not found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const signals = (brief.expert_signals || []).slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Date */}
        <div style={{ display: 'flex', fontSize: 24, color: '#888', marginBottom: 20 }}>
          {brief.brief_date}
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            fontSize: 52,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.2,
            marginBottom: 40,
            maxWidth: '90%',
          }}
        >
          {brief.beginner_headline}
        </div>

        {/* Key signals */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {signals.map((s: any, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: '16px 24px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', fontSize: 16, color: '#888', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color: '#fff' }}>
                {s.value}
              </div>
              <div style={{ display: 'flex', fontSize: 16, color: s.delta?.startsWith('-') ? '#ef4444' : '#22c55e' }}>
                {s.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Branding */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 40,
            right: 60,
            fontSize: 20,
            color: '#555',
            fontWeight: 600,
          }}
        >
          Niftea
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
