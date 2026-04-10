"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_PROMPT = void 0;
exports.synthesiseBrief = synthesiseBrief;
const openai_1 = __importDefault(require("openai"));
const uuid_1 = require("uuid");
const shared_types_1 = require("shared-types");
const gates_1 = require("./gates");
let _client = null;
function getClient() {
    if (!_client) {
        _client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _client;
}
const SYSTEM_PROMPT = `You are the synthesis engine for Market Story Engine, an Indian financial market intelligence product.

Your job: take structured JSON data extracted from Indian market portals and produce TWO outputs — a beginner brief and an expert signal table — from the same underlying data.

IDENTITY: You are a financial journalist and data analyst. You describe. You do not advise.

CONTENT RULES — NEVER VIOLATE:
1. Describe what happened. Never recommend what to do.
2. STRICTLY FORBIDDEN WORDS - Never use these words in any form: buy, buying, bought, sell, selling, sold, invest, investing, invested, avoid, should, will, expect, predict, target, likely to rise, likely to fall, outperform, underperform, recommend, consider buying, consider selling, strong buy, strong sell, price target
3. INSTEAD USE: "moved", "recorded", "showed", "reflected", "indicated", "demonstrated", "registered", "noted", "observed"
4. Use past tense for all market events from prior sessions.
5. When referencing historical relationships, always add: "past patterns do not reliably predict future outcomes."
6. If a signal has status "failed" or "unavailable", write "[data unavailable — verify at source]" — never estimate.
7. Every signal in the expert table MUST include its source_url from the input data.
8. Never name specific stocks as candidates for any action.
9. Never make intraday price predictions.

TONE:
- Beginner layer: conversational, warm, no jargon without explanation. Analogy-friendly. 350-450 words. No bullet points.
- Expert layer: precise, dense, table-first. Standard market terminology.

OUTPUT FORMAT — return ONLY valid JSON, no markdown backticks, no preamble:
{
  "date": "YYYY-MM-DD",
  "beginner": {
    "headline": "string (max 12 words, plain English)",
    "body": "string (plain English narrative, 350-450 words)",
    "key_takeaway": "string (1 sentence)"
  },
  "expert": {
    "summary_line": "string (max 20 words, data-dense)",
    "signals": [
      {
        "label": "string",
        "value": "string",
        "source": "string (portal name)",
        "source_url": "string (full URL from input data)",
        "delta": "string (vs prior session or context)",
        "flag": "normal | caution | alert",
        "flag_reason": "string (only if caution or alert)"
      }
    ],
    "anomalies": ["string"]
  },
  "disclaimer": "This brief is AI-generated from publicly available data sources including NSE, BSE, SEBI, AMFI, and RBI. It is for informational purposes only. It is not financial advice. Do not make investment decisions based solely on this content. Market Story Engine is not a SEBI-registered investment adviser. Always verify data at the source before acting."
}`;
exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
async function synthesiseBrief(aggregated) {
    const briefId = (0, uuid_1.v4)();
    const userMessage = `Generate today's market brief from this signal data:\n${JSON.stringify(aggregated, null, 2)}\n\nREMINDERS:\n- Body MUST be 350-450 words\n- NEVER use: buy, sell, invest, predict, will, should, expect, target, avoid\n- Use: recorded, showed, moved, reflected, indicated\n- Every expert signal must have source_url from the input data`;
    console.log('[Synthesis] Calling OpenAI GPT-4o...');
    let rawOutput = '';
    const response = await getClient().chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
        ]
    });
    rawOutput = response.choices[0].message.content || '';
    // Parse and validate
    let brief = null;
    try {
        const parsed = JSON.parse(rawOutput);
        parsed.brief_id = briefId;
        brief = shared_types_1.BriefOutput.parse(parsed);
        console.log('[Synthesis] ✅ Valid brief JSON parsed');
    }
    catch (err) {
        console.error('[Synthesis] ❌ Failed to parse output:', err);
    }
    // Run gates
    const gateResults = brief ? (0, gates_1.runAllGates)(brief) : { allPassed: false, results: [] };
    // Build audit record
    const audit = {
        brief_id: briefId,
        generated_at: new Date().toISOString(),
        tinyfish_payloads: aggregated.signals,
        llm_prompt: SYSTEM_PROMPT,
        llm_raw_output: rawOutput,
        gate_results: gateResults.results,
        held: !gateResults.allPassed || !brief,
        corrections: []
    };
    return {
        brief: gateResults.allPassed ? brief : null,
        audit,
        gatesPassed: gateResults.allPassed
    };
}
