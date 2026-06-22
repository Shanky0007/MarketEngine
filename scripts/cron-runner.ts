/**
 * Cron runner — single entry point for all scheduled pipeline jobs.
 *
 * Designed to run as a one-shot process (Railway Cron, GitHub Actions, or any
 * external scheduler). It imports the pipelines directly and calls them in-process,
 * so NO long-running HTTP server has to stay up. The process exits when the job
 * finishes, so you only pay for the seconds it actually runs.
 *
 * Usage:
 *   tsx scripts/cron-runner.ts <job>
 *
 *   <job> ∈ daily | sector:morning | sector:midsession | sector:closing
 *
 * Env: reads .env (locally) or platform env vars (Railway/CI). Requires
 *   TINYFISH_API_KEY, OPENAI_API_KEY, DATABASE_URL.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from repo root when present (no-op in deployed envs that inject vars).
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { runDailyPipeline, closePipeline } from '../ingestion/src/pipeline.js';
import { runSectorPipeline, closeSectorPipeline } from '../ingestion/src/sectorPipeline.js';

type Job = 'daily' | 'sector:morning' | 'sector:midsession' | 'sector:closing';

const VALID_JOBS: Job[] = ['daily', 'sector:morning', 'sector:midsession', 'sector:closing'];

function requireEnv(): void {
  const missing = ['DATABASE_URL', 'TINYFISH_API_KEY', 'OPENAI_API_KEY'].filter(
    (k) => !process.env[k]
  );
  if (missing.length > 0) {
    console.error(`[cron-runner] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const job = process.argv[2] as Job | undefined;

  if (!job || !VALID_JOBS.includes(job)) {
    console.error(`[cron-runner] Invalid or missing job.\n  Usage: tsx scripts/cron-runner.ts <${VALID_JOBS.join(' | ')}>`);
    process.exit(1);
  }

  requireEnv();

  const startedAt = new Date().toISOString();
  console.log(`[cron-runner] Job "${job}" started at ${startedAt}`);

  try {
    switch (job) {
      case 'daily':
        await runDailyPipeline();
        break;
      case 'sector:morning':
        await runSectorPipeline('morning');
        break;
      case 'sector:midsession':
        await runSectorPipeline('midsession');
        break;
      case 'sector:closing':
        await runSectorPipeline('closing');
        break;
    }
    console.log(`[cron-runner] Job "${job}" finished OK.`);
  } catch (err) {
    console.error(`[cron-runner] Job "${job}" FAILED:`, err);
    process.exitCode = 1;
  } finally {
    // Close DB pools so the process can exit cleanly.
    await Promise.allSettled([closePipeline(), closeSectorPipeline()]);
  }
}

main();
