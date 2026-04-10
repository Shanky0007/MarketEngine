import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const r = await pool.query('UPDATE sector_scores SET is_partial = true WHERE data_completeness < 4');
  console.log('Updated:', r.rowCount, 'rows');
  await pool.end();
}

main().catch(console.error);
