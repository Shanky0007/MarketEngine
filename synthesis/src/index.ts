import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const app = Fastify();
app.register(cors);

// Health check
app.get('/health', async () => ({
  status: 'ok',
  service: 'synthesis',
  timestamp: new Date().toISOString(),
}));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Closing connections...');
  process.exit(0);
});

app.listen({ port: 3002, host: '0.0.0.0' }, (err) => {
  if (err) throw err;
  console.log('Synthesis service running on port 3002');
  console.log('  GET  /health — health check');
});
