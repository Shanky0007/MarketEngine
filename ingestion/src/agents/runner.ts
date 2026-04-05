import axios from 'axios';
import type { SignalPayloadType } from 'shared-types';

const TINYFISH_API = 'https://agent.tinyfish.ai/v1';
const POLL_INTERVAL_MS = 3000;
const AGENT_TIMEOUT_MS = 300_000; // 5 minutes — generous for complex sites
const CONCURRENCY_LIMIT = 6;

function getApiKey(): string {
  return process.env.TINYFISH_API_KEY!;
}

export interface AgentConfig {
  signal_id: string;
  url: string;
  goal: string;
  timeout_ms?: number;
}

async function runSingleAgent(config: AgentConfig): Promise<SignalPayloadType> {
  try {
    console.log(`  [Agent] ${config.signal_id} — starting...`);

    const runRes = await axios.post(
      `${TINYFISH_API}/automation/run-async`,
      {
        url: config.url,
        goal: config.goal,
        browser_profile: "lite",
        proxy_config: { enabled: false }
      },
      { headers: { "X-API-Key": getApiKey(), "Content-Type": "application/json" } }
    );

    const runId: string = runRes.data.run_id;
    console.log(`  [Agent] ${config.signal_id} — run_id: ${runId}`);

    // Poll until complete or timeout
    const deadline = Date.now() + (config.timeout_ms || AGENT_TIMEOUT_MS);
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await axios.get(
        `${TINYFISH_API}/runs/${runId}`,
        { headers: { "X-API-Key": getApiKey() } }
      );

      const { status, result } = pollRes.data;

      if (status === 'COMPLETED') {
        let parsedData: Record<string, unknown>;
        try {
          parsedData = typeof result === 'string' ? JSON.parse(result) : result;
        } catch {
          parsedData = { raw: result };
        }

        const signalStatus = parsedData.status === 'unavailable' ? 'unavailable' as const : 'ok' as const;
        console.log(`  [Agent] ${config.signal_id} — ${signalStatus}`);

        return {
          signal_id: config.signal_id,
          source_url: config.url,
          extracted_at: new Date().toISOString(),
          status: signalStatus,
          data: parsedData,
          raw_text: typeof result === 'string' ? result : JSON.stringify(result)
        };
      }

      if (status === 'FAILED') {
        console.error(`  [Agent] ${config.signal_id} — FAILED`);
        return {
          signal_id: config.signal_id,
          source_url: config.url,
          extracted_at: new Date().toISOString(),
          status: 'failed',
          data: {},
          error: pollRes.data.error || 'Agent returned FAILED status'
        };
      }
    }

    // Timeout — cancel the run to stop burning steps
    console.error(`  [Agent] ${config.signal_id} — TIMEOUT, cancelling run...`);
    try {
      await axios.post(
        `${TINYFISH_API}/runs/${runId}/cancel`,
        {},
        { headers: { "X-API-Key": getApiKey() } }
      );
      console.error(`  [Agent] ${config.signal_id} — run cancelled`);
    } catch { /* ignore cancel errors */ }

    const usedTimeout = config.timeout_ms || AGENT_TIMEOUT_MS;
    return {
      signal_id: config.signal_id,
      source_url: config.url,
      extracted_at: new Date().toISOString(),
      status: 'failed',
      data: {},
      error: `Agent timed out after ${usedTimeout / 1000}s — run cancelled`
    };

  } catch (err: unknown) {
    console.error(`  [Agent] ${config.signal_id} — ERROR:`, err instanceof Error ? err.message : err);
    return {
      signal_id: config.signal_id,
      source_url: config.url,
      extracted_at: new Date().toISOString(),
      status: 'failed',
      data: {},
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

// Run agents in batches of CONCURRENCY_LIMIT
export async function runAllAgents(agents: AgentConfig[]): Promise<SignalPayloadType[]> {
  console.log(`[Ingestion] Running ${agents.length} agents (concurrency: ${CONCURRENCY_LIMIT})...`);
  const start = Date.now();
  const allPayloads: SignalPayloadType[] = [];

  // Chunk agents into batches
  for (let i = 0; i < agents.length; i += CONCURRENCY_LIMIT) {
    const batch = agents.slice(i, i + CONCURRENCY_LIMIT);
    const batchNum = Math.floor(i / CONCURRENCY_LIMIT) + 1;
    const totalBatches = Math.ceil(agents.length / CONCURRENCY_LIMIT);
    console.log(`[Ingestion] Batch ${batchNum}/${totalBatches}: ${batch.map(a => a.signal_id).join(', ')}`);

    const results = await Promise.allSettled(batch.map(agent => runSingleAgent(agent)));

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        allPayloads.push(r.value);
      } else {
        allPayloads.push({
          signal_id: batch[j].signal_id,
          source_url: batch[j].url,
          extracted_at: new Date().toISOString(),
          status: 'failed',
          data: {},
          error: r.reason?.message || 'Unknown error'
        });
      }
    }
  }

  const okCount = allPayloads.filter(p => p.status === 'ok').length;
  const failCount = allPayloads.filter(p => p.status === 'failed').length;
  const unavailCount = allPayloads.filter(p => p.status === 'unavailable').length;
  console.log(`[Ingestion] Done in ${((Date.now() - start) / 1000).toFixed(1)}s — ${okCount} ok, ${unavailCount} unavailable, ${failCount} failed`);

  return allPayloads;
}
