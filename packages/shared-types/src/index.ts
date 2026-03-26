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
