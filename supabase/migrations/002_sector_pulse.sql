-- ─── Sector Pulse Dashboard — Migration 002 ─────────────────────────────────
-- Adds 4 new tables for sector scoring pipeline.
-- Does NOT modify any tables from 001_initial.sql.

-- Sector scores: one row per sector per pipeline run
CREATE TABLE sector_scores (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID        NOT NULL,
  run_time          TIMESTAMPTZ NOT NULL,
  run_window        VARCHAR(20) NOT NULL,
  sector            VARCHAR(20) NOT NULL,
  score             INTEGER     NOT NULL CHECK (score >= 0 AND score <= 100),
  traffic_light     VARCHAR(10) NOT NULL,
  signal_breakdown  JSONB       NOT NULL,
  beginner_label    TEXT        NOT NULL,
  data_completeness INTEGER     NOT NULL CHECK (data_completeness >= 0 AND data_completeness <= 5),
  is_partial        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Anomaly events: fired when a sector crosses a detection threshold
CREATE TABLE anomaly_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sector              VARCHAR(20) NOT NULL,
  anomaly_type        VARCHAR(50) NOT NULL,
  severity            VARCHAR(10) NOT NULL,
  raw_data            JSONB       NOT NULL,
  alert_text          TEXT        NOT NULL,
  historical_context  TEXT,
  disclaimer          TEXT        NOT NULL,
  detected_at         TIMESTAMPTZ NOT NULL,
  alerts_sent         JSONB       DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Score audits: full TinyFish + scoring input/output for every run
CREATE TABLE score_audits (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID        NOT NULL,
  tinyfish_payloads JSONB       NOT NULL,
  scoring_inputs    JSONB       NOT NULL,
  scores_computed   JSONB       NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- MF weekly averages: sector-level 52-week baseline for score normalisation
CREATE TABLE mf_weekly_averages (
  sector      VARCHAR(20) PRIMARY KEY,
  avg_cr      NUMERIC     NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed conservative MF weekly averages (₹ crores, based on AMFI sector data)
INSERT INTO mf_weekly_averages (sector, avg_cr) VALUES
  ('IT',      800),
  ('BANKING', 1200),
  ('PHARMA',  400),
  ('AUTO',    500),
  ('FMCG',   600),
  ('ENERGY',  700),
  ('METALS',  350);

-- Indexes
CREATE INDEX sector_scores_sector_time  ON sector_scores (sector, run_time DESC);
CREATE INDEX sector_scores_run_window   ON sector_scores (run_window, run_time DESC);
CREATE INDEX sector_scores_run_id       ON sector_scores (run_id);
CREATE INDEX anomaly_events_sector      ON anomaly_events (sector, detected_at DESC);
CREATE INDEX anomaly_events_severity    ON anomaly_events (severity, detected_at DESC);
CREATE INDEX score_audits_run_id        ON score_audits (run_id);
