#!/usr/bin/env tsx
/**
 * Deployment Verification Script
 * Run this after deploying to verify all services are working
 */

import axios from 'axios';

const VERCEL_URL = process.env.VERCEL_URL || 'http://localhost:3000';
const INGESTION_URL = process.env.INGESTION_URL || 'http://localhost:3001';
const SYNTHESIS_URL = process.env.SYNTHESIS_URL || 'http://localhost:3002';
const PUBLISHER_URL = process.env.PUBLISHER_URL || 'http://localhost:3003';

async function checkService(name: string, url: string, path: string = '/health') {
  try {
    const response = await axios.get(`${url}${path}`, { timeout: 5000 });
    console.log(`✅ ${name}: OK (${response.status})`);
    return true;
  } catch (error: any) {
    console.log(`❌ ${name}: FAILED (${error.message})`);
    return false;
  }
}

async function main() {
  console.log('🔍 Verifying deployment...\n');

  const results = await Promise.all([
    checkService('Web App', VERCEL_URL, '/'),
    checkService('Ingestion Service', INGESTION_URL),
    checkService('Synthesis Service', SYNTHESIS_URL),
    checkService('Publisher Service', PUBLISHER_URL),
  ]);

  const allPassed = results.every(r => r);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All services are healthy!');
  } else {
    console.log('❌ Some services failed. Check logs above.');
    process.exit(1);
  }
}

main();
