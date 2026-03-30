import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import cron from 'node-cron';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runDailyPipeline, closePipeline } from './pipeline';

const app = Fastify();
app.register(cors);

// Health check endpoint
app.get('/health', async () => ({
  status: 'ok',
  service: 'ingestion',
  next_run: '07:00 IST daily'
}));

// Manual trigger endpoint
app.post('/api/trigger', async (_req, reply) => {
  console.log('[Manual Trigger] Pipeline triggered manually');
  runDailyPipeline().catch(err => {
    console.error('[Manual Trigger] Pipeline failed:', err);
  });
  return reply.send({ message: 'Pipeline triggered', timestamp: new Date().toISOString() });
});

// Schedule: 7:00am IST = 1:30am UTC
cron.schedule('30 1 * * *', async () => {
  console.log('[Cron] 7:00am IST — firing daily pipeline');
  try {
    await runDailyPipeline();
  } catch (err) {
    console.error('[Cron] Pipeline failed:', err);
  }
}, {
  timezone: 'Asia/Kolkata'
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Closing connections...');
  await closePipeline();
  process.exit(0);
});

app.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
  if (err) throw err;
  console.log('Ingestion service running on port 3001');
  console.log('Cron scheduled: 7:00am IST daily');
  console.log('Manual trigger: POST /api/trigger');
  console.log('Health check: GET /health');
});
