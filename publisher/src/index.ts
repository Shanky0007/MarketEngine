import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify();
app.register(cors);

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'publisher',
  timestamp: new Date().toISOString(),
}));

// Manual trigger endpoint
app.post('/api/trigger', async (_req, reply) => {
  console.log('[Manual Trigger] Publisher pipeline triggered');
  // TODO: Implement publisher pipeline trigger
  return reply.send({ 
    message: 'Publisher pipeline triggered', 
    timestamp: new Date().toISOString() 
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Closing connections...');
  process.exit(0);
});

app.listen({ port: 3003, host: '0.0.0.0' }, (err) => {
  if (err) throw err;
  console.log('Publisher service running on port 3003');
  console.log('  POST /api/trigger — manual trigger');
  console.log('  GET  /health      — health check');
});
