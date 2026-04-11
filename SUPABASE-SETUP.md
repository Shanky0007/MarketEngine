# Supabase Setup Guide

Quick guide to set up Supabase for your Market Story Engine.

---

## Step 1: Create Supabase Project (5 minutes)

1. Go to https://supabase.com/dashboard
2. Sign in or create account
3. Click **"New Project"**
4. Fill in:
   - **Name**: `market-engine`
   - **Database Password**: Create strong password (SAVE THIS!)
   - **Region**: Choose closest (e.g., Mumbai/Singapore for India)
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup

---

## Step 2: Get Your Credentials

### Database Connection String
1. Go to **Settings** (gear icon) → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the string:
   ```
   postgresql://postgres.[PROJECT-ID]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual password

### API Keys
1. Go to **Settings** → **API**
2. Copy these:
   - **Project URL**: `https://[PROJECT-ID].supabase.co`
   - **anon public key**: `eyJhbGc...` (long JWT token)

---

## Step 3: Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy contents of `supabase/migrations/001_initial.sql`
4. Paste and click **"Run"**
5. Create another new query
6. Copy contents of `supabase/migrations/002_sector_pulse.sql`
7. Paste and click **"Run"**

**Verify tables created:**
- Go to **Table Editor**
- You should see: `briefs`, `audit_trail`, `sector_scores`, etc.

---

## Step 4: Disable RLS (Important!)

For each table:
1. Go to **Authentication** → **Policies**
2. Find your tables
3. If RLS is enabled, click **"Disable RLS"**
4. Or when creating tables, don't enable RLS

**Why?** Your app uses server-side connections with full database access, not client-side queries.

---

## Step 5: Update Local Environment Files

### Update `.env` (root directory)
```env
DATABASE_URL=postgresql://postgres.[PROJECT-ID]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### Update `web/.env.local`
```env
DATABASE_URL=postgresql://postgres.[PROJECT-ID]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your anon key)
```

---

## Step 6: Test Connection Locally

```powershell
# Test database connection
npm run test:runner

# Or test a simple query
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log(r.rows)).catch(e => console.error(e));"
```

---

## Step 7: Add to Vercel

In Vercel deployment screen, add:

```
DATABASE_URL=postgresql://postgres.[PROJECT-ID]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (your anon key)

NODE_ENV=production
```

---

## Step 8: Add to Railway

For each service (ingestion, synthesis, publisher), add:

```
DATABASE_URL=postgresql://postgres.[PROJECT-ID]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

TINYFISH_API_KEY=your_key
OPENAI_API_KEY=your_key
SUBSTACK_API_KEY=your_key
SUBSTACK_PUBLICATION_ID=your_id
SLACK_WEBHOOK_URL=your_webhook
NODE_ENV=production
PUBLISH_TIME_IST=08:00
```

---

## Quick Reference

### Connection String Format
```
postgresql://postgres.[PROJECT-ID]:[PASSWORD]@[HOST].supabase.com:6543/postgres
```

### Where to Find Values
- **Project ID**: In your Supabase project URL
- **Password**: The one you created when setting up project
- **Host**: Shown in Settings → Database → Connection string
- **API Keys**: Settings → API

---

## Troubleshooting

### Can't connect to database
- Check password is correct
- Verify connection string format
- Check if IP is whitelisted (Supabase allows all by default)

### Tables not found
- Run migrations in SQL Editor
- Check Table Editor to verify tables exist

### RLS errors
- Disable RLS for all tables
- Or add policy: `CREATE POLICY "Allow all" ON table_name FOR ALL USING (true);`

---

## Security Notes

- **Never commit** `.env` files to git (already in .gitignore)
- Use Supabase's connection pooler (port 6543) for serverless
- Keep your database password secure
- Rotate API keys if exposed

---

**Done?** Now you can deploy to Vercel and Railway!
