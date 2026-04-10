import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

export type BriefRow = {
  id: string;
  brief_date: string;
  beginner_headline: string;
  beginner_body: string;
  beginner_takeaway: string;
  expert_summary: string;
  expert_signals: any[];
  expert_anomalies: string[];
  disclaimer: string;
  published_at: string | null;
  held: boolean;
  created_at: string;
};

export async function getLatestBrief(): Promise<BriefRow | null> {
  try {
    const res = await pool.query(
      `SELECT id, brief_date::text as brief_date, beginner_headline, beginner_body, beginner_takeaway, expert_summary, expert_signals, expert_anomalies, disclaimer, published_at::text as published_at, held, created_at::text as created_at FROM briefs WHERE held = false ORDER BY brief_date DESC LIMIT 1`
    );
    return res.rows[0] || null;
  } catch {
    return null;
  }
}

export async function getBriefByDate(date: string): Promise<BriefRow | null> {
  try {
    const res = await pool.query(
      `SELECT id, brief_date::text as brief_date, beginner_headline, beginner_body, beginner_takeaway, expert_summary, expert_signals, expert_anomalies, disclaimer, published_at::text as published_at, held, created_at::text as created_at FROM briefs WHERE brief_date = $1`,
      [date]
    );
    return res.rows[0] || null;
  } catch {
    return null;
  }
}

export async function getAllBriefs(): Promise<BriefRow[]> {
  try {
    const res = await pool.query(
      `SELECT id, brief_date::text as brief_date, beginner_headline, held, published_at::text as published_at FROM briefs ORDER BY brief_date DESC`
    );
    return res.rows;
  } catch {
    return [];
  }
}
