import { z } from 'zod';

export const SignalStatus = z.enum(['ok', 'failed', 'partial', 'unavailable']);

export const SignalPayload = z.object({
  signal_id: z.string(),
  source_url: z.string().url(),
  extracted_at: z.string().datetime(),
  status: SignalStatus,
  data: z.record(z.string(), z.unknown()),
  raw_text: z.string().optional(),
  error: z.string().optional()
});

export const AggregatedSignals = z.object({
  date: z.string(),
  generated_at: z.string().datetime(),
  signals: z.array(SignalPayload),
  failed_count: z.number(),
  ok_count: z.number()
});

export const ExpertSignal = z.object({
  label: z.string(),
  value: z.string(),
  source: z.string(),
  source_url: z.string().url(),
  delta: z.string(),
  flag: z.enum(['normal', 'caution', 'alert']),
  flag_reason: z.string().optional()
});

export const BriefOutput = z.object({
  date: z.string(),
  brief_id: z.string().uuid(),
  beginner: z.object({
    headline: z.string(),
    body: z.string(),
    key_takeaway: z.string()
  }),
  expert: z.object({
    summary_line: z.string(),
    signals: z.array(ExpertSignal),
    anomalies: z.array(z.string())
  }),
  disclaimer: z.string()
});

export const GateResult = z.object({
  gate: z.enum(['prohibited_language', 'source_completeness', 'disclaimer_presence']),
  passed: z.boolean(),
  details: z.string().optional()
});

export const AuditRecord = z.object({
  brief_id: z.string().uuid(),
  generated_at: z.string().datetime(),
  tinyfish_payloads: z.array(SignalPayload),
  llm_prompt: z.string(),
  llm_raw_output: z.string(),
  gate_results: z.array(GateResult),
  published_at: z.string().datetime().optional(),
  held: z.boolean(),
  corrections: z.array(z.string())
});

export type SignalPayloadType = z.infer<typeof SignalPayload>;
export type AggregatedSignalsType = z.infer<typeof AggregatedSignals>;
export type ExpertSignalType = z.infer<typeof ExpertSignal>;
export type BriefOutputType = z.infer<typeof BriefOutput>;
export type GateResultType = z.infer<typeof GateResult>;
export type AuditRecordType = z.infer<typeof AuditRecord>;

// ─── Sector Pulse Dashboard Types ────────────────────────────────────────────

export const SectorId = z.enum([
  'IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'
]);

export const RunWindow = z.enum(['morning', 'midsession', 'closing']);

export const SectorSignalBreakdown = z.object({
  fii_net_cr: z.number().nullable(),
  dii_net_cr: z.number().nullable(),
  pcr: z.number().nullable(),
  block_deal_net_cr: z.number().nullable(),
  mf_inflow_cr: z.number().nullable(),
  data_completeness: z.number().min(0).max(5)
});

export const SectorScore = z.object({
  sector: SectorId,
  score: z.number().min(0).max(100),
  traffic_light: z.enum(['green', 'amber', 'red']),
  beginner_label: z.string(),
  signal_breakdown: SectorSignalBreakdown,
  computed_at: z.string().datetime(),
  run_window: RunWindow,
  is_partial: z.boolean()
});

export const AnomalyType = z.enum([
  'consecutive_fii_sell',
  'pcr_threshold_breach',
  'score_reversal',
  'large_block_deal',
  'dii_absorption_failure',
  'sector_divergence'
]);

export const AnomalyEvent = z.object({
  sector: SectorId,
  anomaly_type: AnomalyType,
  severity: z.enum(['HIGH', 'MEDIUM']),
  raw_data: z.record(z.string(), z.unknown()),
  alert_text: z.string(),
  historical_context: z.string().optional(),
  disclaimer: z.string(),
  detected_at: z.string().datetime()
});

export const SectorRunResult = z.object({
  run_id: z.string().uuid(),
  run_window: RunWindow,
  run_time: z.string().datetime(),
  scores: z.array(SectorScore),
  anomalies: z.array(AnomalyEvent),
  agent_payloads: z.array(z.unknown())
});

export type SectorIdType = z.infer<typeof SectorId>;
export type RunWindowType = z.infer<typeof RunWindow>;
export type SectorScoreType = z.infer<typeof SectorScore>;
export type AnomalyEventType = z.infer<typeof AnomalyEvent>;
export type AnomalyTypeType = z.infer<typeof AnomalyType>;
export type SectorRunResultType = z.infer<typeof SectorRunResult>;
export type SectorSignalBreakdownType = z.infer<typeof SectorSignalBreakdown>;
