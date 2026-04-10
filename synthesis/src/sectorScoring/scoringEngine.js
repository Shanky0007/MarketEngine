"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseFIINet = normaliseFIINet;
exports.normalisePCR = normalisePCR;
exports.normaliseDIINet = normaliseDIINet;
exports.normaliseBlockDeal = normaliseBlockDeal;
exports.normaliseMFInflow = normaliseMFInflow;
exports.computeSectorScore = computeSectorScore;
exports.computeAllSectors = computeAllSectors;
// ─── Scoring weights (must sum to 1.0) ───────────────────────────────────────
const WEIGHTS = {
    FII_NET: 0.35,
    PCR: 0.25,
    DII_NET: 0.20,
    BLOCK_DEAL_NET: 0.10,
    MF_INFLOW: 0.10,
};
// ─── Normalisation functions (all return 0–100) ───────────────────────────────
// -5000 cr = 0, 0 = 50, +5000 cr = 100
function normaliseFIINet(netCr) {
    return Math.max(0, Math.min(100, (netCr + 5000) / 100));
}
// Non-linear — extreme PCR is contrarian bullish
function normalisePCR(pcr) {
    if (pcr <= 0.5)
        return 10;
    if (pcr <= 0.7)
        return 10 + ((pcr - 0.5) / 0.2) * 20; // 10–30
    if (pcr <= 0.9)
        return 30 + ((pcr - 0.7) / 0.2) * 20; // 30–50
    if (pcr <= 1.1)
        return 50 + ((pcr - 0.9) / 0.2) * 15; // 50–65
    if (pcr <= 1.3)
        return 65 + ((pcr - 1.1) / 0.2) * 15; // 65–80
    if (pcr <= 1.5)
        return 80 + ((pcr - 1.3) / 0.2) * 10; // 80–90
    return 90; // >1.5 contrarian
}
// -3000 cr = 0, 0 = 50, +3000 cr = 100 (approx)
function normaliseDIINet(netCr) {
    return Math.max(0, Math.min(100, (netCr + 3000) / 60));
}
// -2000 cr = 0, 0 = 50, +2000 cr = 100
function normaliseBlockDeal(netCr) {
    return Math.max(0, Math.min(100, (netCr + 2000) / 40));
}
// Relative to 52-week sector average
function normaliseMFInflow(inflow, weeklyAvg) {
    if (weeklyAvg <= 0)
        return 50; // no baseline — treat as neutral
    if (inflow < 0)
        return 20;
    if (inflow >= 2 * weeklyAvg)
        return 80;
    // linear: 0 → 20, avg → 55, 2×avg → 80
    if (inflow <= weeklyAvg) {
        return 20 + (inflow / weeklyAvg) * 35; // 20–55
    }
    return 55 + ((inflow - weeklyAvg) / weeklyAvg) * 25; // 55–80
}
// ─── Score label helpers ──────────────────────────────────────────────────────
function trafficLight(score) {
    if (score >= 60)
        return 'green';
    if (score >= 40)
        return 'amber';
    return 'red';
}
function beginnerLabel(light) {
    const labels = {
        green: 'Institutional buy pressure',
        amber: 'Mixed institutional signals',
        red: 'Institutional sell pressure',
    };
    return labels[light];
}
// ─── Main scoring function ────────────────────────────────────────────────────
function computeSectorScore(sector, signals, mfWeeklyAvg, runWindow = 'closing') {
    // Map each signal to its raw normalised value (null if unavailable)
    const normalised = {
        FII_NET: signals.fii_net_cr !== null ? normaliseFIINet(signals.fii_net_cr) : null,
        PCR: signals.pcr !== null ? normalisePCR(signals.pcr) : null,
        DII_NET: signals.dii_net_cr !== null ? normaliseDIINet(signals.dii_net_cr) : null,
        BLOCK_DEAL_NET: signals.block_deal_net_cr !== null ? normaliseBlockDeal(signals.block_deal_net_cr) : null,
        MF_INFLOW: signals.mf_inflow_cr !== null ? normaliseMFInflow(signals.mf_inflow_cr, mfWeeklyAvg) : null,
    };
    // Collect available signals and their weights
    const available = Object.keys(WEIGHTS).filter(k => normalised[k] !== null);
    const totalWeight = available.reduce((sum, k) => sum + WEIGHTS[k], 0);
    let score;
    if (available.length === 0) {
        score = 50; // all signals missing — neutral
    }
    else {
        // Redistribute weights proportionally across available signals
        const weightedSum = available.reduce((sum, k) => {
            const redistributed = WEIGHTS[k] / totalWeight;
            return sum + normalised[k] * redistributed;
        }, 0);
        score = Math.round(weightedSum);
    }
    // Clamp to 0–100 (should already be within range, but defensive)
    score = Math.max(0, Math.min(100, score));
    const light = trafficLight(score);
    return {
        sector,
        score,
        traffic_light: light,
        beginner_label: beginnerLabel(light),
        signal_breakdown: signals,
        computed_at: new Date().toISOString(),
        run_window: runWindow,
        is_partial: signals.data_completeness < 4,
    };
}
// ─── Compute all 7 sectors at once ───────────────────────────────────────────
const ALL_SECTORS = ['IT', 'BANKING', 'PHARMA', 'AUTO', 'FMCG', 'ENERGY', 'METALS'];
function computeAllSectors(signalsBySector, mfAvgBySector, runWindow = 'closing') {
    return ALL_SECTORS.map(sector => computeSectorScore(sector, signalsBySector[sector], mfAvgBySector[sector] ?? 500, runWindow));
}
