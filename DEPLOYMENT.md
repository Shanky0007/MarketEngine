# Deployment Guide - Vercel + Railway

## Architecture Overview
- **Vercel**: Hosts Next.js web app (public-facing)
- **Railway**: Hosts background services (ingestion, synthesis, publisher)
- **Supabase**: PostgreSQL database (already configured)

---

## Part 1: Vercel Setup (Web App)

### Prerequisites
- GitHub repository pushed
- Vercel account (sign up at vercel.com)

### Steps

1. **Import Project**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel auto-detects Next.js

2. **Configure Root Directory**
   - Framework Preset: `Next.js`
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Environment Variables**
   Add these in Vercel dashboard:
   ```
   DATABASE_URL=your_supabase_connection_string
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NODE_ENV=production
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your web app is live at `your-project.vercel.app`

5. **Add Custom Domain**
   - Go to Project Settings → Domains
   - Add your domain (e.g., `niftea.com`)
   - Update DNS records as shown:
     - Type: `A` or `CNAME`
     - Name: `@` (root) or `www`
     - Value: Vercel's provided value
   - SSL auto-provisions in ~5 minutes

---

## Part 2: Railway Setup (Background Services)

### Prerequisites
- Railway account (sign up at railway.app)
- GitHub repository connected

### Steps

1. **Create New Project**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your repository

2. **Configure Services**
   Railway will create one service. You need to create 3 separate services:

   **Service 1: Ingestion**
   - Name: `ingestion`
   - Root Directory: `ingestion`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Port: `3001`

   **Service 2: Synthesis**
   - Name: `synthesis`
   - Root Directory: `synthesis`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Port: `3002`

   **Service 3: Publisher**
   - Name: `publisher`
   - Root Directory: `publisher`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
   - Port: `3003`

3. **Environment Variables**
   Add these to ALL THREE services:
   ```
   TINYFISH_API_KEY=your_key
   OPENAI_API_KEY=your_key
   SUBSTACK_API_KEY=your_key
   SUBSTACK_PUBLICATION_ID=your_id
   DATABASE_URL=your_supabase_connection_string
   SLACK_WEBHOOK_URL=your_webhook
   NODE_ENV=production
   PUBLISH_TIME_IST=08:00
   ```

4. **Set Up Scheduling** — see the dedicated [Scheduling](#scheduling) section below.

5. **Deploy**
   - Railway auto-deploys on git push
   - Monitor logs in dashboard
   - Services restart automatically on failure

---

## Scheduling

The pipelines do **not** run themselves — they are one-shot jobs invoked on a schedule.
Nothing needs to stay on 24/7 at your end; the scheduler spins a container up, runs the
job, and shuts it down. Pick **one** of the two options below (don't enable both, or jobs
will run twice).

All four jobs are driven by a single runner: `scripts/cron-runner.ts <job>`, where
`<job>` is one of `daily`, `sector:morning`, `sector:midsession`, `sector:closing`.
npm shortcuts exist for each: `npm run cron:daily`, `npm run cron:sector:morning`, etc.

| Job                  | When (IST, Mon–Fri) | Cron (UTC)        | What it does                          |
|----------------------|---------------------|-------------------|---------------------------------------|
| `daily`              | 08:00 (pre-market)  | `30 2 * * 1-5`    | Generate + publish the daily brief    |
| `sector:morning`     | 09:30               | `0 4 * * 1-5`     | Sector pulse opening snapshot         |
| `sector:midsession`  | 12:30               | `0 7 * * 1-5`     | Sector pulse mid-session snapshot     |
| `sector:closing`     | 15:45               | `15 10 * * 1-5`   | Sector pulse closing snapshot         |

Required env for every job: `DATABASE_URL`, `TINYFISH_API_KEY`, `OPENAI_API_KEY`
(plus optional `SUBSTACK_*`, `SLACK_WEBHOOK_URL`).

### Option A — Railway Cron (recommended if already on Railway)

Railway cannot define multiple services from one file, so create **four** cron services
(New → Empty Service → same repo) and set, on each one's **Settings**:
- **Cron Schedule** → the UTC value from the table above
- **Custom Start Command** → the matching `npm run cron:…` command
- the same environment variables as the worker services

The reference values are in [`railway.cron.json`](./railway.cron.json).

### Option B — GitHub Actions (zero infra, free)

Already wired in [`.github/workflows/scheduled-pipelines.yml`](./.github/workflows/scheduled-pipelines.yml).
Add the secrets under **Repo Settings → Secrets and variables → Actions**
(`DATABASE_URL`, `TINYFISH_API_KEY`, `OPENAI_API_KEY`, optional `SUBSTACK_*`, `SLACK_WEBHOOK_URL`).
The schedules fire automatically; you can also run any job on demand from the **Actions**
tab via **Run workflow**.

### Data-source reliability

Exchange/regulator sites (NSE, BSE, SEBI) are bot-hostile and frequently time out with
TinyFish's lightweight browser. On the **free tier** the only valid settings are
`browser_profile: "lite"` + no proxy + **max 2 concurrent agents** — other values return
HTTP 400. The runner defaults to concurrency 2 for this reason; tune with:

```
TINYFISH_CONCURRENCY=2          # raise only on a paid plan
TINYFISH_BROWSER_PROFILE=lite   # paid plans may support other profiles
TINYFISH_PROXY=false            # paid plans may support a proxy
```

Even at concurrency 2, some exchange pages may still time out intermittently on the free
tier — sector scores will then be `[partial]`. Reliable full-coverage data requires a paid
TinyFish plan that supports a heavier browser profile / residential proxy.

### Honest empty state vs. demo data

The dashboard shows **real** data when the DB has scores, an **honest "no data yet"**
banner when it doesn't, and an **error** banner if the DB is unreachable. It only shows
sample/demo numbers when you explicitly set `USE_MOCK_DATA=true` (useful for a UI demo
before the first pipeline run).

---

## Part 3: Connect Services

### Internal Communication
Railway services can communicate via internal URLs:
- Ingestion: `http://ingestion.railway.internal:3001`
- Synthesis: `http://synthesis.railway.internal:3002`
- Publisher: `http://publisher.railway.internal:3003`

Update your service configs to use these URLs in production.

### External Access (Optional)
If you need public endpoints:
- Railway auto-generates public URLs
- Or add custom domain per service

---

## Part 4: Post-Deployment Checklist

### Verify Web App (Vercel)
- [ ] Visit your domain - site loads
- [ ] Check `/brief/2026-03-30` - brief renders
- [ ] Check `/dashboard` - Sector Pulse Dashboard loads
- [ ] Test sector cards and scoring display
- [ ] Test mobile responsiveness
- [ ] Verify disclaimer appears
- [ ] Check OG image: `https://your-domain.com/api/og/2026-03-30`
- [ ] Test dashboard API: `https://your-domain.com/api/dashboard/scores`

### Verify Background Services (Railway)
- [ ] All 3 services show "Active" status
- [ ] Check logs for errors
- [ ] Test ingestion endpoint: `curl https://ingestion-url/health`
- [ ] Test synthesis endpoint: `curl https://synthesis-url/health`
- [ ] Manually run a job: `npm run cron:sector:morning` (or trigger from the GitHub Actions tab)
- [ ] Verify rows appear in Supabase (`sector_scores` / `briefs`)
- [ ] Check Slack notification received

### Verify Schedule
- [ ] Confirm cron services / Actions schedules are set (see [Scheduling](#scheduling))
- [ ] Run one job manually and check logs for clean completion
- [ ] Verify new rows in the database after the run
- [ ] Verify the dashboard shows live data (no "no data" / "demo data" banner)
- [ ] For the daily brief: check Substack publication (or HTML fallback in `output/`)

---

## Part 5: Monitoring & Maintenance

### Vercel
- Monitor deployments: https://vercel.com/dashboard
- View analytics: Project → Analytics
- Check logs: Project → Logs

### Railway
- Monitor services: https://railway.app/dashboard
- View logs: Service → Logs (real-time)
- Set up alerts: Settings → Notifications

### Database
- Monitor Supabase: https://supabase.com/dashboard
- Check query performance
- Review storage usage

---

## Troubleshooting

### Web App Not Loading
1. Check Vercel deployment logs
2. Verify environment variables set
3. Test database connection
4. Check DNS propagation (can take 24-48 hours)

### Background Services Failing
1. Check Railway logs for errors
2. Verify all environment variables present
3. Test API keys (TinyFish, OpenAI, Substack)
4. Check Supabase connection string
5. Verify service ports not conflicting

### Scheduled Job Not Running
1. Check the cron service logs (Railway) or the run history (GitHub Actions tab)
2. Verify schedule format is UTC (see the [Scheduling](#scheduling) table)
3. Run the job manually: `npm run cron:sector:morning` — confirm it exits cleanly
4. Confirm `DATABASE_URL`, `TINYFISH_API_KEY`, `OPENAI_API_KEY` are set on the job env

### Sector Scores Come Back `[partial]` / Mostly 50
1. Agents are timing out on NSE/BSE/SEBI — this is a TinyFish free-tier limitation
2. Confirm `TINYFISH_CONCURRENCY=2` (free-tier cap); higher values throttle and time out
3. Check the cron-runner log for `TIMEOUT` lines to see which agents failed
4. A score of 50 with `data_completeness 0` means no signals were captured for that sector
5. Reliable full coverage needs a paid TinyFish plan (heavier browser profile / proxy)

### Briefs Not Publishing
1. Check all 3 legal gates passing
2. Verify Substack API key valid
3. Check Slack webhook working
4. Review synthesis service logs
5. Verify database write permissions

---

## Cost Estimate

### Vercel
- Hobby Plan: **Free**
- Includes: 100GB bandwidth, unlimited deployments
- Custom domain: Free SSL

### Railway
- Starter Plan: **$5/month** (500 hours)
- 3 services × ~$2-3 each = **~$6-9/month**
- Includes: 8GB RAM, 8GB storage per service

### Supabase
- Free tier: **$0**
- Upgrade if needed: $25/month

**Total: ~$5-10/month**

---

## Quick Commands

### Deploy Web App
```bash
git push origin main  # Auto-deploys to Vercel
```

### Deploy Background Services
```bash
git push origin main  # Auto-deploys to Railway
```

### Manual Trigger (Testing)
```bash
curl -X POST https://your-publisher-url.railway.app/api/trigger
```

### View Logs
```bash
# Vercel
vercel logs your-project-name

# Railway (use dashboard or CLI)
railway logs
```

---

## Next Steps

1. Push code to GitHub
2. Set up Vercel (15 minutes)
3. Set up Railway (20 minutes)
4. Configure environment variables
5. Test manual trigger
6. Wait for first scheduled run
7. Add custom domain
8. Monitor for 24 hours
9. Launch! 🚀
