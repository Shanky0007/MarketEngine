'use client';

type Signal = {
  label: string;
  value: string;
  source: string;
  source_url: string;
  delta: string;
  flag: 'normal' | 'caution' | 'alert';
  flag_reason?: string;
};

export default function SignalTable({ signals }: { signals: Signal[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--gold)]/20">
            <th className="text-left py-3 px-4 label">Signal</th>
            <th className="text-right py-3 px-4 label">Value</th>
            <th className="text-right py-3 px-4 label">Delta</th>
            <th className="text-left py-3 px-4 label">Source</th>
            <th className="text-center py-3 px-4 label">Status</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s, i) => (
            <tr
              key={i}
              className={`signal-row border-b border-[#1a1a1e] ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-raised)]'}`}
            >
              <td className="py-3 px-4 text-[13px] font-medium text-[var(--text-primary)]">{s.label}</td>
              <td className="py-3 px-4 text-right font-data text-[13px] text-[var(--text-primary)]">{s.value}</td>
              <td className="py-3 px-4 text-right font-data text-[13px]">
                <span className={s.delta?.startsWith('-') ? 'text-[var(--red)]' : 'text-[var(--green)]'}>
                  {s.delta?.startsWith('-') ? '↓ ' : '↑ '}{s.delta}
                </span>
              </td>
              <td className="py-3 px-4">
                <a
                  href={s.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link inline-flex items-center gap-1 text-[11px] text-[var(--gold-dim)] hover:text-[var(--gold)] transition-colors duration-150"
                >
                  {s.source}
                  <svg className="link-icon w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </td>
              <td className="py-3 px-4 text-center">
                {s.flag === 'normal' && <span className="inline-block w-2 h-2 rounded-full bg-[var(--green)]" />}
                {s.flag === 'caution' && <span className="inline-block w-2 h-2 rounded-full bg-[var(--amber)]" title={s.flag_reason} />}
                {s.flag === 'alert' && <span className="inline-block w-2 h-2 rounded-full bg-[var(--red)] alert-pulse" title={s.flag_reason} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
