-- Briefs table: one row per published brief
CREATE TABLE briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date DATE NOT NULL UNIQUE,
  beginner_headline TEXT NOT NULL,
  beginner_body TEXT NOT NULL,
  beginner_takeaway TEXT NOT NULL,
  expert_summary TEXT NOT NULL,
  expert_signals JSONB NOT NULL,
  expert_anomalies TEXT[] NOT NULL,
  disclaimer TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  held BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log: full generation record per brief
CREATE TABLE brief_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES briefs(id),
  generated_at TIMESTAMPTZ NOT NULL,
  tinyfish_payloads JSONB NOT NULL,
  llm_prompt TEXT NOT NULL,
  llm_raw_output TEXT NOT NULL,
  gate_results JSONB NOT NULL,
  corrections JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for date-based queries
CREATE INDEX briefs_date_idx ON briefs(brief_date);
CREATE INDEX audits_brief_idx ON brief_audits(brief_id);
