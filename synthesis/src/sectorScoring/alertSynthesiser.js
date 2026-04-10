"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesiseAlerts = synthesiseAlerts;
const openai_1 = __importDefault(require("openai"));
const gates_js_1 = require("../gates.js");
const FALLBACK_CONTEXT = 'Insufficient historical data to establish a pattern. Past patterns do not predict future outcomes.';
const SYSTEM_PROMPT = `You are the alert writer for Sector Pulse Dashboard, an Indian market intelligence product.

You receive: an anomaly event (what unusual thing happened in a sector) and 30 days of historical score data for that sector.

Your job: write ONE sentence of historical context — what has happened historically when this pattern appeared before.

RULES — NEVER VIOLATE:
1. Write historical pattern only. Never predict what will happen.
2. Never use: will, likely to, expected to, should, buy, sell, invest, avoid, going to, may rise, may fall
3. Reference specific historical occurrences with approximate percentages if available.
4. Always end with: "Past patterns do not predict future outcomes."
5. Maximum output: 2 sentences total including the closing disclaimer sentence.
6. If insufficient historical data (fewer than 5 data points): write exactly "${FALLBACK_CONTEXT}"

OUTPUT FORMAT — return ONLY valid JSON, no markdown:
{
  "historical_context": "string (1-2 sentences)"
}`;
let _client = null;
function getClient() {
    if (!_client) {
        _client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _client;
}
async function synthesiseOneAlert(anomaly, historicalScores) {
    const sectorHistory = historicalScores
        .filter(s => s.sector === anomaly.sector)
        .sort((a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime())
        .slice(0, 30);
    // Need at least 5 data points to write meaningful context
    if (sectorHistory.length < 5) {
        return FALLBACK_CONTEXT;
    }
    const historyPayload = sectorHistory.map(s => ({
        score: s.score,
        fii_net: s.signal_breakdown.fii_net_cr,
        pcr: s.signal_breakdown.pcr,
        date: s.computed_at,
    }));
    let raw = '';
    try {
        const response = await getClient().chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 200,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Anomaly type: ${anomaly.anomaly_type}
Sector: ${anomaly.sector}
What happened: ${anomaly.alert_text}
Raw data: ${JSON.stringify(anomaly.raw_data)}
30-day score history: ${JSON.stringify(historyPayload)}`
                }
            ]
        });
        raw = response.choices[0]?.message?.content ?? '';
    }
    catch (err) {
        console.error(`[Alert Synthesiser] OpenAI call failed for ${anomaly.sector}/${anomaly.anomaly_type}:`, err.message);
        return FALLBACK_CONTEXT;
    }
    // Parse JSON response
    let historicalContext = '';
    try {
        const parsed = JSON.parse(raw);
        historicalContext = parsed.historical_context?.trim() ?? '';
    }
    catch {
        console.error(`[Alert Synthesiser] JSON parse failed for ${anomaly.sector}/${anomaly.anomaly_type}`);
        return FALLBACK_CONTEXT;
    }
    if (!historicalContext)
        return FALLBACK_CONTEXT;
    // Gate 1 check on the generated context — build a minimal brief-shaped object
    const mockBrief = {
        date: new Date().toISOString().split('T')[0],
        brief_id: '00000000-0000-0000-0000-000000000000',
        beginner: { headline: historicalContext, body: '', key_takeaway: '' },
        expert: { summary_line: '', signals: [], anomalies: [] },
        disclaimer: anomaly.disclaimer,
    };
    const gate1 = (0, gates_js_1.runGate1ProhibitedLanguage)(mockBrief);
    if (!gate1.passed) {
        console.error(`[Alert Synthesiser] Gate 1 failed for ${anomaly.sector}/${anomaly.anomaly_type}: ${gate1.details}`);
        return FALLBACK_CONTEXT;
    }
    return historicalContext;
}
async function synthesiseAlerts(anomalies, historicalScores) {
    const enriched = [];
    for (const anomaly of anomalies) {
        const historicalContext = await synthesiseOneAlert(anomaly, historicalScores);
        console.log(`[Alert Synthesiser] ${anomaly.sector}/${anomaly.anomaly_type} — context written`);
        enriched.push({ ...anomaly, historical_context: historicalContext });
    }
    return enriched;
}
