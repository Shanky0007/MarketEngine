# 🚀 Deployment Guide - Vercel + Railway

Complete guide to deploy Market Story Engine to production.

## 📋 Prerequisites
- [ ] GitHub repo pushed
- [ ] Vercel account (vercel.com)
- [ ] Railway account (railway.app)
- [ ] Domain DNS access
- [ ] All API keys ready (TinyFish, OpenAI, Substack, Slack)
- [ ] Supabase database set up

---

## 🏗️ Architecture Overview

```
┌─────────────┐
│ Your Domain │ → Vercel (Next.js Web App)
└─────────────┘      - Daily Briefs Archive
       ↓              - Sector Pulse Dashboard
┌─────────────┐      - OG Image Generation
│  Supabase   │ ← Railway (3 Background Services)
│  Database   │      - Ingestion (Port 3001)
└─────────────┘      - Synthesis (Port 3002)
                     - Publisher (Port 3003)
```

**What gets deployed:**
- Daily brief archive at `/brief/[date]`
- Live Sector Pulse Dashboard at `/dashboard`
- API endpoints for sector scores
- Automated daily brief generation (7 AM IST)
- Sector scoring updates (morning, mid-session, closing)

---

## 1️⃣ Vercel (Web App) - 10 minutes

```bash
# 1. Go to vercel.com/new
# 2. Import your GitHub repo
# 3. Configure:
Root Directory: web
Framework: Next.js (auto-detected)
Build Command: npm run build
Output Directory: .next

# 4. Add Environment Variables:
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NODE_ENV=production

# 5. Deploy → Done!
```

**Add Your Domain:**
- Settings → Domains → Add `yourdomain.com`
- Update DNS: A record → Vercel's IP
- SSL auto-provisions in 5 min

---

## 2️⃣ Railway (Background Services) - 20 minutes

Railway will host your 3 background services. You have two options:

### Option A: Three Separate Services (Recommended)

This gives you better control and monitoring per service.

**Step 1: Create Project**
1. Go to railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Railway creates one service automatically

**Step 2: Configure Ingestion Service**
1. Click on the service → Settings
2. Configure:
   ```
   Name: ingestion
   Root Directory: ingestion
   Build Command: npm install && npm run build
   Start Command: npm run start
   ```
3. Add environment variables (see env vars section below)
4. Deploy

**Step 3: Add Synthesis Service**
1. Click "New" → "GitHub Repo" (same repo)
2. Configure:
   ```
   Name: synthesis
   Root Directory: synthesis
   Build Command: npm install && npm run build
   Start Command: npm run start
   ```
3. Add environment variables
4. Deploy

**Step 4: Add Publisher Service**
1. Click "New" → "GitHub Repo" (same repo)
2. Configure:
   ```
   Name: publisher
   Root Directory: publisher
   Build Command: npm install && npm run build
   Start Command: npm run start
   ```
3. Add environment variables
4. Deploy

**Environment Variables (Add to ALL services):**
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

### Option B: Single Service (Simpler, Less Control)

1. Go to railway.app/new
2. Deploy from GitHub repo
3. Configure:
   ```
   Build Command: npm install && npm run build
   Start Command: npm run start --workspace=ingestion & npm run start --workspace=synthesis & npm run start --workspace=publisher
   ```
4. Add all environment variables
5. Deploy

---

## 3️⃣ Set Up Cron Job - 5 minutes

Your briefs need to generate daily at 7:00 AM IST (1:30 AM UTC).

### In Railway (Recommended)

**Option 1: Railway Cron Service**
1. In your Railway project, click "New"
2. Select "Empty Service"
3. Name it "cron-trigger"
4. Go to Settings → Cron
5. Add schedule:
   ```
   Schedule: 30 1 * * *
   Command: curl -X POST https://your-publisher-url.railway.app/api/trigger
   ```
6. Save

**Option 2: Publisher Service Cron**
1. Go to Publisher service → Settings
2. Click "Cron" tab
3. Add schedule:
   ```
   Schedule: 30 1 * * *
   Command: curl http://localhost:3003/api/trigger
   ```
4. Save

### External Cron (Alternative)

Use cron-job.org or similar:
1. Sign up at cron-job.org
2. Create new cron job:
   ```
   URL: https://your-publisher-url.railway.app/api/trigger
   Schedule: 30 1 * * * (1:30 AM UTC)
   Method: POST
   ```
3. Save

---

## 4️⃣ Verify Deployment

```bash
# Set your URLs
export VERCEL_URL=https://yourdomain.com
export INGESTION_URL=https://ingestion.railway.app
export SYNTHESIS_URL=https://synthesis.railway.app
export PUBLISHER_URL=https://publisher.railway.app

# Run verification
npm run verify:deployment
```

Or manually:
```bash
curl https://yourdomain.com
curl https://ingestion-url.railway.app/health
curl https://synthesis-url.railway.app/health
curl https://publisher-url.railway.app/health
```

---

## 5️⃣ Test Pipeline

```bash
# Trigger manual brief generation
curl -X POST https://publisher-url.railway.app/api/trigger

# Check logs in Railway dashboard
# Verify brief in Supabase
# Check Slack notification
# Visit https://yourdomain.com/brief/2026-04-11
```

---

## 🔧 Environment Variables Checklist

### Vercel (Web App)
```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NODE_ENV=production
```

### Railway (All Services)
```
TINYFISH_API_KEY
OPENAI_API_KEY
SUBSTACK_API_KEY
SUBSTACK_PUBLICATION_ID
DATABASE_URL
SLACK_WEBHOOK_URL
NODE_ENV=production
PUBLISH_TIME_IST=08:00
```

---

## 📊 Monitoring

**Vercel:**
- Dashboard: https://vercel.com/dashboard
- Logs: Project → Logs
- Analytics: Project → Analytics

**Railway:**
- Dashboard: https://railway.app/dashboard
- Logs: Service → Logs (real-time)
- Metrics: Service → Metrics

**Supabase:**
- Dashboard: https://supabase.com/dashboard
- Database: Table Editor
- Logs: Logs Explorer

---

## 🆘 Troubleshooting

### Web app not loading
```bash
# Check Vercel logs
# Verify env vars set in Vercel dashboard
# Test database connection from Vercel logs
# Check DNS propagation: https://dnschecker.org
```

### Services failing on Railway
```bash
# Check Railway logs for each service
# Verify all env vars present
# Test API keys locally first
# Check build logs for errors
# Verify TypeScript compiled: npm run build
```

### Cron not running
```bash
# Verify schedule is in UTC (IST - 5:30)
# Test manual trigger first:
curl -X POST https://publisher-url.railway.app/api/trigger

# Check service health before cron time
# Review Railway cron logs
```

### Briefs not publishing
```bash
# Check all 3 legal gates passing
# Verify Substack API key valid
# Check Slack webhook working
# Review synthesis service logs
# Verify database write permissions
```

### Build failures
```bash
# Locally test build:
npm run build

# Check for missing dependencies
# Verify TypeScript compiles
# Check Railway build logs
```

---

## 💰 Cost

- Vercel: **Free** (Hobby plan)
- Railway: **~$5-10/month** (3 services)
- Supabase: **Free** (or $25/month Pro)

**Total: $5-10/month**

---

## 🎯 Next Steps

1. ✅ Deploy to Vercel
2. ✅ Deploy to Railway
3. ✅ Add environment variables
4. ✅ Set up cron job
5. ✅ Add custom domain
6. ✅ Test manual trigger
7. ✅ Wait for first scheduled run
8. ✅ Monitor for 24 hours
9. 🚀 Launch!

---

**Need help?** Check DEPLOYMENT.md for detailed instructions.
