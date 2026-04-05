import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const sql = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/002_sector_pulse.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('✓ Migration 002_sector_pulse.sql applied successfully');

    // Verify tables exist
    const { rows } = await pool.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('sector_scores','anomaly_events','score_audits','mf_weekly_averages')
      ORDER BY tablename
    `);
    console.log('✓ Tables created:', rows.map(r => r.tablename).join(', '));

    // Verify MF averages seeded
    const { rows: mf } = await pool.query<{ sector: string; avg_cr: number }>(
      'SELECT sector, avg_cr FROM mf_weekly_averages ORDER BY sector'
    );
    console.log('✓ MF weekly averages seeded:');
    mf.forEach(r => console.log(`    ${r.sector}: ${r.avg_cr} cr`));

  } catch (err) {
    console.error('✗ Migration failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
