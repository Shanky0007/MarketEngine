import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runDailyPipeline, closePipeline } from './pipeline';
import { runSectorPipeline, closeSectorPipeline } from './sectorPipeline';

const app = Fastify();
app.register(cors);

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'ingestion',
  triggers: {
    daily_brief:        'POST /api/trigger',
    sector_morning:     'POST /api/sector/trigger/morning',
    sector_midsession:  'POST /api/sector/trigger/midsession',
    sector_closing:     'POST /api/sector/trigger/closing',
  }
}));

// ─── Daily brief trigger ──────────────────────────────────────────────────────
app.post('/api/trigger', async (_req, reply) => {
  console.log('[Manual Trigger] Daily brief pipeline triggered');
  runDailyPipeline().catch(err => {
    console.error('[Manual Trigger] Daily pipeline failed:', err);
  });
  return reply.send({ message: 'Daily brief pipeline triggered', timestamp: new Date().toISOString() });
});

// ─── Sector pipeline triggers ─────────────────────────────────────────────────
app.post('/api/sector/trigger/morning', async (_req, reply) => {
  console.log('[Manual Trigger] Sector morning run triggered');
  runSectorPipeline('morning').catch(err => {
    console.error('[Manual Trigger] Sector morning run failed:', err);
  });
  return reply.send({ message: 'Sector morning pipeline triggered', timestamp: new Date().toISOString() });
});

app.post('/api/sector/trigger/midsession', async (_req, reply) => {
  console.log('[Manual Trigger] Sector midsession run triggered');
  runSectorPipeline('midsession').catch(err => {
    console.error('[Manual Trigger] Sector midsession run failed:', err);
  });
  return reply.send({ message: 'Sector midsession pipeline triggered', timestamp: new Date().toISOString() });
});

app.post('/api/sector/trigger/closing', async (_req, reply) => {
  console.log('[Manual Trigger] Sector closing run triggered');
  runSectorPipeline('closing').catch(err => {
    console.error('[Manual Trigger] Sector closing run failed:', err);
  });
  return reply.send({ message: 'Sector closing pipeline triggered', timestamp: new Date().toISOString() });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Closing connections...');
  await Promise.all([closePipeline(), closeSectorPipeline()]);
  process.exit(0);
});

app.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
  if (err) throw err;
  console.log('Ingestion service running on port 3001');
  console.log('Triggers:');
  console.log('  POST /api/trigger                    — daily brief');
  console.log('  POST /api/sector/trigger/morning     — sector morning run');
  console.log('  POST /api/sector/trigger/midsession  — sector mid-session run');
  console.log('  POST /api/sector/trigger/closing     — sector closing run');
  console.log('  GET  /health                         — health check');
});
