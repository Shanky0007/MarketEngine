import 'dotenv/config';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SAMPLE_DATA = {
  date: "2026-03-22",
  signals: [
    {
      signal_id: "fii_net_equity",
      source_url: "https://www.nseindia.com/market-data/fii-dii-activity",
      extracted_at: new Date().toISOString(),
      status: "ok",
      data: {
        fii: { buy: 14823.45, sell: 17291.10, net: -2467.65 },
        dii: { buy: 19104.30, sell: 14200.80, net: 4903.50 },
        unit: "crores INR"
      }
    },
    {
      signal_id: "sgx_nifty",
      source_url: "https://www.sgx.com/derivatives/product-details/IN",
      extracted_at: new Date().toISOString(),
      status: "ok",
      data: { price: 22340.50, change_pct: -0.42 }
    },
    {
      signal_id: "usd_inr",
      source_url: "https://www.rbi.org.in",
      extracted_at: new Date().toISOString(),
      status: "ok",
      data: { rate: 84.72, change_pct: 0.18 }
    }
  ]
};

const SYSTEM_PROMPT = `You are the synthesis engine for Market Story Engine, an Indian financial market intelligence product.

Your job: take structured JSON data extracted from Indian market portals and produce TWO outputs from the same underlying data.

CONTENT RULES — NEVER VIOLATE:
1. Describe what happened. Never recommend what to do.
2. STRICTLY FORBIDDEN WORDS - Never use these words in any form: buy, buying, bought, sell, selling, sold, invest, investing, invested, avoid, should, will, expect, predict, target, likely to rise, likely to fall
3. INSTEAD USE: "moved", "recorded", "showed", "reflected", "indicated", "demonstrated", "registered"
4. Use past tense for all market events from prior sessions.
5. When referencing historical relationships, always add: "past patterns do not reliably predict future outcomes."
6. If a signal has status "failed" or "unavailable", write "[data unavailable — verify at source: URL]"
7. Every signal in the expert table must include its source_url.
8. Never name specific stocks as recommendations.

BEGINNER BODY REQUIREMENTS:
- MUST be between 350-450 words (count carefully)
- Conversational, warm tone
- Explain jargon when used
- 3-minute read
- Focus on what the data shows, not what people should do

EXPERT LAYER REQUIREMENTS:
- Precise, dense, table-first
- Standard market terminology allowed
- Data-focused

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no preamble:
{
  "date": "YYYY-MM-DD",
  "beginner": {
    "headline": "string (max 12 words, plain English)",
    "body": "string (plain English narrative, MUST be 350-450 words)",
    "key_takeaway": "string (1 sentence)"
  },
  "expert": {
    "summary_line": "string (max 20 words, data-dense)",
    "signals": [
      {
        "label": "string",
        "value": "string",
        "source": "string",
        "source_url": "string",
        "delta": "string",
        "flag": "normal | caution | alert",
        "flag_reason": "string (only if caution or alert)"
      }
    ],
    "anomalies": ["string"]
  },
  "disclaimer": "This brief is AI-generated from publicly available data sources including NSE, BSE, SEBI, AMFI, and RBI. It is for informational purposes only. It is not financial advice. Do not make investment decisions based solely on this content. Market Story Engine is not a SEBI-registered investment adviser. Always verify data at the source before acting."
}`;

async function runSynthesisPOC() {
  console.log('[POC] Running OpenAI synthesis...');

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `Generate today's market brief from this signal data:\n${JSON.stringify(SAMPLE_DATA, null, 2)}\n\nIMPORTANT REMINDERS:\n- Beginner body MUST be 350-450 words (not less!)\n- NEVER use these words: buy, sell, invest, predict, will, should, expect, target\n- Use alternatives: "recorded", "showed", "moved", "reflected", "indicated"\n- Describe what happened, never what people should do`
      }
    ]
  });

  const raw = response.choices[0].message.content || '';

  try {
    const brief = JSON.parse(raw);
    console.log('\n✅ SYNTHESIS SUCCESSFUL\n');
    console.log('BEGINNER HEADLINE:', brief.beginner.headline);
    console.log('\nBEGINNER BODY (first 200 chars):');
    console.log(brief.beginner.body.substring(0, 200) + '...');
    console.log('\nEXPERT SIGNALS:', brief.expert.signals.length, 'signals');
    console.log('\nDISCLAIMER PRESENT:', !!brief.disclaimer);
    console.log('\nANOMALIES:', brief.expert.anomalies);
    
    // Validation checks
    const wordCount = brief.beginner.body.split(/\s+/).length;
    console.log('\nBEGINNER BODY WORD COUNT:', wordCount, '(target: 350-450)');
    
    // Check for prohibited words in recommendation context (not descriptive)
    const prohibitedPhrases = [
      /\b(should|must|need to|have to)\s+(buy|sell|invest)/i,
      /\b(buy|sell|invest)\s+(now|immediately|today)/i,
      /\b(will|going to|expected to|likely to)\s+(rise|fall|increase|decrease)/i,
      /\b(recommend|suggest|advise).*(buy|sell|invest)/i,
      /\b(avoid|stay away from)/i
    ];
    
    const bodyText = brief.beginner.body;
    const foundProhibited = prohibitedPhrases.filter(pattern => pattern.test(bodyText));
    
    if (foundProhibited.length > 0) {
      console.log('\n⚠️  WARNING: Found prohibited recommendation phrases');
    } else {
      console.log('\n✅ No prohibited recommendation phrases found');
    }
    
    // Check all signals have source_url
    const missingUrls = brief.expert.signals.filter((s: any) => !s.source_url);
    if (missingUrls.length > 0) {
      console.log('\n⚠️  WARNING: Some signals missing source_url');
    } else {
      console.log('✅ All signals have source_url');
    }
    
    console.log('\nFull JSON:');
    console.log(JSON.stringify(brief, null, 2));
  } catch (e) {
    console.error('❌ OpenAI returned invalid JSON:');
    console.error(raw);
    process.exit(1);
  }
}

runSynthesisPOC();
