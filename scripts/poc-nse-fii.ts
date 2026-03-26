import 'dotenv/config';
import axios from 'axios';

const TINYFISH_API = 'https://agent.tinyfish.ai/v1';
const API_KEY = process.env.TINYFISH_API_KEY!;

async function runAgent() {
  console.log('[POC] Starting NSE FII/DII extraction...');
  const start = Date.now();

  // Step 1: Fire the agent
  const runRes = await axios.post(
    `${TINYFISH_API}/automation/run-async`,
    {
      url: "https://www.nseindia.com/market-data/fii-dii-activity",
      goal: `Extract today's FII and DII net activity. Return ONLY this JSON structure (no extra text):
{
  "date": "DD-MMM-YYYY",
  "fii_net": number,
  "dii_net": number,
  "unit": "crores INR"
}
If data unavailable, return: { "status": "unavailable" }`,
      browser_profile: "lite",  // Use lite instead of stealth to save steps
      proxy_config: { enabled: false }  // Disable proxy to save steps
    },
    { headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" } }
  );

  const runId = runRes.data.run_id;
  console.log(`[POC] Run ID: ${runId}`);

  // Step 2: Poll until complete
  const timeout = Date.now() + 300_000; // 5 minutes
  while (Date.now() < timeout) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await axios.get(
      `${TINYFISH_API}/runs/${runId}`,
      { headers: { "X-API-Key": API_KEY } }
    );
    const { status, result } = pollRes.data;
    console.log(`[${new Date().toLocaleTimeString()}] Status: ${status}`);

    if (status === 'COMPLETED') {
      console.log('\n✅ EXTRACTION SUCCESSFUL');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nElapsed: ${((Date.now() - start) / 1000).toFixed(1)}s`);
      process.exit(0);
    }
    if (status === 'FAILED') {
      console.error('❌ AGENT FAILED:', pollRes.data.error);
      process.exit(1);
    }
  }
  console.error('❌ TIMEOUT');
  process.exit(1);
}

runAgent();
