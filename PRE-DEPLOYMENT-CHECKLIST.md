# Pre-Deployment Checklist

Complete these steps BEFORE deploying to production.

---

## 1. Code Preparation

- [ ] All code committed to GitHub
- [ ] `.env` file NOT committed (check .gitignore)
- [ ] `.env.example` updated with all required variables
- [ ] All TypeScript builds successfully: `npm run build`
- [ ] No console.log statements in production code
- [ ] Error handling in place for all API calls

---

## 2. Environment Variables

### Required for Vercel (Web)
- [ ] `DATABASE_URL` - Supabase connection string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `NODE_ENV=production`

### Required for Railway (All Services)
- [ ] `TINYFISH_API_KEY` - TinyFish API key
- [ ] `OPENAI_API_KEY` - OpenAI API key (for Claude via OpenAI)
- [ ] `SUBSTACK_API_KEY` - Substack API key
- [ ] `SUBSTACK_PUBLICATION_ID` - Your Substack publication ID
- [ ] `DATABASE_URL` - Supabase connection string
- [ ] `SLACK_WEBHOOK_URL` - Slack webhook for notifications
- [ ] `NODE_ENV=production`
- [ ] `PUBLISH_TIME_IST=08:00`

---

## 3. Database Setup

- [ ] Supabase project created
- [ ] Migrations run: `001_initial.sql`
- [ ] Migrations run: `002_sector_pulse.sql`
- [ ] Database connection tested locally
- [ ] Row Level Security (RLS) configured if needed
- [ ] Database backups enabled

---

## 4. API Keys Verification

Test each API key locally:

```bash
# TinyFish
npm run test:runner

# OpenAI/Claude
npm run poc:synthesis

# Substack
npm run test:publisher

# Database
npm run test:pipeline
```

- [ ] TinyFish API working
- [ ] OpenAI API working
- [ ] Substack API working
- [ ] Database connection working
- [ ] Slack webhook working

---

## 5. Legal Compliance

- [ ] Disclaimer text finalized
- [ ] All 3 legal gates implemented
- [ ] Gate tests passing: `npm run test:gates`
- [ ] Disclaimer visible in web app
- [ ] Disclaimer in Substack template
- [ ] "Not SEBI-registered" notice on About page

---

## 6. Content Preparation

- [ ] At least 7 backdated briefs generated
- [ ] Briefs stored in database
- [ ] HTML output tested
- [ ] All source URLs valid
- [ ] Reading levels (Simple/Detailed) working

---

## 7. Domain Setup

- [ ] Domain purchased and accessible
- [ ] DNS management access confirmed
- [ ] SSL certificate will auto-provision (Vercel handles this)
- [ ] Subdomain strategy decided (www vs root)

---

## 8. Monitoring Setup

- [ ] Slack webhook configured for alerts
- [ ] Error logging strategy defined
- [ ] Uptime monitoring tool chosen (optional: UptimeRobot, Pingdom)
- [ ] Log retention policy defined

---

## 9. Deployment Files

- [ ] `vercel.json` created ✅
- [ ] `railway.toml` created ✅
- [ ] `nixpacks.toml` created ✅
- [ ] `.vercelignore` created ✅
- [ ] `.railwayignore` created ✅
- [ ] Health check endpoints added ✅
- [ ] `DEPLOYMENT.md` reviewed ✅

---

## 10. Testing Strategy

- [ ] Local testing completed
- [ ] Manual pipeline trigger tested
- [ ] Cron schedule verified (UTC conversion)
- [ ] Rollback plan documented
- [ ] Staging environment considered (optional)

---

## 11. Launch Plan

- [ ] Launch date decided
- [ ] First brief content reviewed
- [ ] Social media posts drafted
- [ ] "What is this?" page written
- [ ] Community announcement prepared
- [ ] Support email/contact set up

---

## 12. Post-Launch Monitoring

- [ ] Monitor first 24 hours closely
- [ ] Check first scheduled cron run
- [ ] Verify Substack publication
- [ ] Monitor error logs
- [ ] Check database growth
- [ ] Verify all legal gates passing

---

## Ready to Deploy?

If all boxes are checked:

1. **Deploy Web App**: Follow `DEPLOYMENT-QUICKSTART.md` Section 1
2. **Deploy Services**: Follow `DEPLOYMENT-QUICKSTART.md` Section 2
3. **Set Up Cron**: Follow `DEPLOYMENT-QUICKSTART.md` Section 3
4. **Verify**: Run `npm run verify:deployment`
5. **Test**: Trigger manual brief generation
6. **Monitor**: Watch logs for 24 hours
7. **Launch**: Announce to the world! 🚀

---

## Emergency Contacts

- Vercel Support: https://vercel.com/support
- Railway Support: https://railway.app/help
- Supabase Support: https://supabase.com/support
- Your team: [Add contact info]

---

**Last Updated:** 2026-04-11
