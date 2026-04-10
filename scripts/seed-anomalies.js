const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://mse:mse@127.0.0.1:5432/mse' });

const now = new Date().toISOString();
const disclaimer = 'This alert describes historical data patterns. It is not financial advice. Past patterns do not predict future outcomes. Niftea is not a SEBI-registered investment adviser.';

async function seed() {
  await pool.query(
    `INSERT INTO anomaly_events (sector, anomaly_type, severity, raw_data, alert_text, historical_context, disclaimer, detected_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      'IT', 'consecutive_fii_sell', 'HIGH',
      JSON.stringify({ streak_length: 4, total_outflow_cr: -12400, sector: 'IT' }),
      'FII net equity in IT has been negative for 4 consecutive sessions, totalling -\u20B912,400 Cr.',
      'In the last 12 months, IT experienced 2 similar FII sell streaks. Past patterns do not predict future outcomes.',
      disclaimer, now,
    ]
  );

  await pool.query(
    `INSERT INTO anomaly_events (sector, anomaly_type, severity, raw_data, alert_text, disclaimer, detected_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      'METALS', 'large_block_deal', 'MEDIUM',
      JSON.stringify({ deal_value_cr: 600, sector: 'METALS', deal_type: 'buy' }),
      'A block deal of \u20B9600 Cr (buy) was recorded in the METALS sector this session.',
      disclaimer, now,
    ]
  );

  console.log('Seeded 2 anomalies (1 HIGH, 1 MEDIUM)');
  await pool.end();
}

seed().catch(e => { console.error(e); pool.end(); });
