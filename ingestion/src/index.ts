import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runDailyPipeline, closePipeline } from './pipeline';

const app = Fastify();
app.register(cors);

// Health check endpoint
app.get('/health', async () => ({
  status: 'ok',
  service: 'ingestion'
}));

// Manual trigger endpoint
app.post('/api/trigger', async (_req, reply) => {
  console.log('[Manual Trigger] Pipeline triggered');
  runDailyPipeline().catch(err => {
    console.error('[Manual Trigger] Pipeline failed:', err);
  });
  return reply.send({ message: 'Pipeline triggered', timestamp: new Date().toISOString() });
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
  console.log('Manual trigger: POST /api/trigger');
  console.log('Health check: GET /health');
});
