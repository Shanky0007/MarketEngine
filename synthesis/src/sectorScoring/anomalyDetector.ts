import type {
  SectorIdType,
  AnomalyEventType,
  SectorScoreType,
  SectorSignalBreakdownType,
} from 'shared-types';

const ANOMALY_DISCLAIMER =
  'This alert describes historical data patterns. It is not financial advice. ' +
  'Past patterns do not predict future outcomes. Niftea is not a SEBI-registered investment adviser.';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// Returns historical scores for a specific sector, sorted newest-first
function sectorHistory(sector: SectorIdType, historical: SectorScoreType[]): SectorScoreType[] {
  return historical
    .filter(s => s.sector === sector)
    .sort((a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime());
}

// ─── Anomaly 1 — consecutive_fii_sell (HIGH) ──────────────────────────────────
// Trigger: FII net negative for 3+ consecutive sessions in same sector
function checkConsecutiveFIISell(
  currentSignals: Record<SectorIdType, SectorSignalBreakdownType>,
  historical: SectorScoreType[],
): AnomalyEventType[] {
  const anomalies: AnomalyEventType[] = [];

  const sectors: SectorIdType[] = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];

  for (const sector of sectors) {
    const current = currentSignals[sector];
    if (current.fii_net_cr === null || current.fii_net_cr >= 0) continue;

    // Get last 3 historical runs for this sector
    const hist = sectorHistory(sector, historical).slice(0, 3);
    if (hist.length < 3) continue;

    const allNegative = hist.every(s => {
      const fii = s.signal_breakdown.fii_net_cr;
      return fii !== null && fii < 0;
    });

    if (!allNegative) continue;

    const totalOutflow =
      hist.reduce((sum, s) => sum + (s.signal_breakdown.fii_net_cr ?? 0), 0) +
      current.fii_net_cr;
    const streakLength = hist.length + 1;

    anomalies.push({
      sector,
      anomaly_type: 'consecutive_fii_sell',
      severity: 'HIGH',
      raw_data: {
        streak_length: streakLength,
        total_outflow_cr: Math.round(totalOutflow),
        sector,
      },
      alert_text: `FII net equity in ${sector} has been negative for ${streakLength} consecutive sessions, totalling -₹${Math.abs(Math.round(totalOutflow)).toLocaleString('en-IN')} cr.`,
      disclaimer: ANOMALY_DISCLAIMER,
      detected_at: now(),
    });
  }

  return anomalies;
}

// ─── Anomaly 2 — pcr_threshold_breach (HIGH) ─────────────────────────────────
// Trigger: PCR drops below 0.65 OR rises above 1.6
function checkPCRThresholdBreach(
  currentSignals: Record<SectorIdType, SectorSignalBreakdownType>,
): AnomalyEventType[] {
  const anomalies: AnomalyEventType[] = [];
  const sectors: SectorIdType[] = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];

  for (const sector of sectors) {
    const pcr = currentSignals[sector].pcr;
    if (pcr === null) continue;

    let threshold: string | null = null;
    if (pcr < 0.65)  threshold = 'below 0.65 (low put activity)';
    if (pcr > 1.6)   threshold = 'above 1.6 (extreme put buying)';
    if (!threshold) continue;

    anomalies.push({
      sector,
      anomaly_type: 'pcr_threshold_breach',
      severity: 'HIGH',
      raw_data: { pcr, threshold, sector },
      alert_text: `${sector} put-call ratio is ${pcr.toFixed(2)}, which is ${threshold}.`,
      disclaimer: ANOMALY_DISCLAIMER,
      detected_at: now(),
    });
  }

  return anomalies;
}

// ─── Anomaly 3 — score_reversal (HIGH) ───────────────────────────────────────
// Trigger: Sector score changes by 25+ points between consecutive runs
function checkScoreReversal(
  currentScores: SectorScoreType[],
  historical: SectorScoreType[],
): AnomalyEventType[] {
  const anomalies: AnomalyEventType[] = [];

  for (const current of currentScores) {
    const prev = sectorHistory(current.sector, historical)[0];
    if (!prev) continue;

    const delta = current.score - prev.score;
    if (Math.abs(delta) < 25) continue;

    anomalies.push({
      sector: current.sector,
      anomaly_type: 'score_reversal',
      severity: 'HIGH',
      raw_data: {
        prev_score: prev.score,
        current_score: current.score,
        delta,
        sector: current.sector,
      },
      alert_text: `${current.sector} sector score moved from ${prev.score} to ${current.score} (${delta > 0 ? '+' : ''}${delta} points) between sessions.`,
      disclaimer: ANOMALY_DISCLAIMER,
      detected_at: now(),
    });
  }

  return anomalies;
}

// ─── Anomaly 4 — large_block_deal (MEDIUM) ───────────────────────────────────
// Trigger: Single block deal net > ₹500 cr in one sector in one session
function checkLargeBlockDeal(
  currentSignals: Record<SectorIdType, SectorSignalBreakdownType>,
): AnomalyEventType[] {
  const anomalies: AnomalyEventType[] = [];
  const sectors: SectorIdType[] = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];

  for (const sector of sectors) {
    const net = currentSignals[sector].block_deal_net_cr;
    if (net === null || Math.abs(net) <= 500) continue;

    const dealType = net > 0 ? 'buy' : 'sell';

    anomalies.push({
      sector,
      anomaly_type: 'large_block_deal',
      severity: 'MEDIUM',
      raw_data: {
        deal_value_cr: Math.abs(net),
        sector,
        deal_type: dealType,
      },
      alert_text: `${sector} recorded a net block deal ${dealType} of ₹${Math.abs(net).toLocaleString('en-IN')} cr this session.`,
      disclaimer: ANOMALY_DISCLAIMER,
      detected_at: now(),
    });
  }

  return anomalies;
}

// ─── Anomaly 5 — dii_absorption_failure (MEDIUM) ─────────────────────────────
// Trigger: FII net sell > ₹2000 cr AND DII net buy < ₹500 cr
function checkDIIAbsorptionFailure(
  currentSignals: Record<SectorIdType, SectorSignalBreakdownType>,
): AnomalyEventType[] {
  const anomalies: AnomalyEventType[] = [];
  const sectors: SectorIdType[] = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];

  for (const sector of sectors) {
    const fii = currentSignals[sector].fii_net_cr;
    const dii = currentSignals[sector].dii_net_cr;
    if (fii === null || dii === null) continue;
    if (fii >= -2000 || dii >= 500) continue;

    anomalies.push({
      sector,
      anomaly_type: 'dii_absorption_failure',
      severity: 'MEDIUM',
      raw_data: {
        fii_sell_cr: Math.abs(fii),
        dii_buy_cr: dii,
        sector,
      },
      alert_text: `FII sold ₹${Math.abs(fii).toLocaleString('en-IN')} cr in ${sector} while DII net was only ₹${dii.toLocaleString('en-IN')} cr — domestic absorption below threshold.`,
      disclaimer: ANOMALY_DISCLAIMER,
      detected_at: now(),
    });
  }

  return anomalies;
}

// ─── Anomaly 6 — sector_divergence (MEDIUM) ──────────────────────────────────
// Trigger: One sector scores 80+ while aggregate NIFTY score is below 40
function checkSectorDivergence(
  currentScores: SectorScoreType[],
): AnomalyEventType[] {
  const anomalies: AnomalyEventType[] = [];

  if (currentScores.length === 0) return anomalies;

  const marketScore = Math.round(
    currentScores.reduce((sum, s) => sum + s.score, 0) / currentScores.length
  );

  if (marketScore >= 40) return anomalies;

  for (const s of currentScores) {
    if (s.score < 80) continue;

    anomalies.push({
      sector: s.sector,
      anomaly_type: 'sector_divergence',
      severity: 'MEDIUM',
      raw_data: {
        divergent_sector: s.sector,
        sector_score: s.score,
        market_score: marketScore,
      },
      alert_text: `${s.sector} scored ${s.score} while the broad market composite is ${marketScore} — significant sector divergence detected.`,
      disclaimer: ANOMALY_DISCLAIMER,
      detected_at: now(),
    });
  }

  return anomalies;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectAnomalies(
  currentScores: SectorScoreType[],
  historicalScores: SectorScoreType[],
  currentSignals: Record<SectorIdType, SectorSignalBreakdownType>,
): AnomalyEventType[] {
  return [
    ...checkConsecutiveFIISell(currentSignals, historicalScores),
    ...checkPCRThresholdBreach(currentSignals),
    ...checkScoreReversal(currentScores, historicalScores),
    ...checkLargeBlockDeal(currentSignals),
    ...checkDIIAbsorptionFailure(currentSignals),
    ...checkSectorDivergence(currentScores),
  ];
}
