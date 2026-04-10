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

4. **Set Up Cron Job**
   - In Railway dashboard, go to Publisher service
   - Click "Settings" → "Cron"
   - Add schedule: `30 1 * * *` (7:00 AM IST = 1:30 AM UTC)
   - Command: `curl http://localhost:3003/api/trigger`

   Or use Railway's Cron service:
   - Create new service → Cron
   - Schedule: `30 1 * * *`
   - Command: `curl https://your-publisher-service.railway.app/api/trigger`

5. **Deploy**
   - Railway auto-deploys on git push
   - Monitor logs in dashboard
   - Services restart automatically on failure

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
- [ ] Test mobile responsiveness
- [ ] Verify disclaimer appears
- [ ] Check OG image: `https://your-domain.com/api/og/2026-03-30`

### Verify Background Services (Railway)
- [ ] All 3 services show "Active" status
- [ ] Check logs for errors
- [ ] Test ingestion endpoint: `curl https://ingestion-url/health`
- [ ] Test synthesis endpoint: `curl https://synthesis-url/health`
- [ ] Manually trigger pipeline: `curl -X POST https://publisher-url/api/trigger`
- [ ] Verify brief appears in Supabase database
- [ ] Check Slack notification received

### Verify Cron Job
- [ ] Wait for scheduled time (7:00 AM IST)
- [ ] Check Railway logs for cron execution
- [ ] Verify new brief generated
- [ ] Check Substack publication
- [ ] Verify web app shows new brief

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

### Cron Job Not Running
1. Check Railway cron logs
2. Verify schedule format (UTC time)
3. Test manual trigger endpoint
4. Check service health before cron runs

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
