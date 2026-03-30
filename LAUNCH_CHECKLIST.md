# Launch Checklist — Market Story Engine

## LEGAL
- [ ] Disclaimer visible on EVERY brief in web app (both reading levels)
- [ ] Disclaimer visible in EVERY Substack email
- [ ] "Not SEBI-registered investment adviser" on About page
- [ ] All three gates passing for last 7 generated briefs
- [ ] Audit trail records confirmed in database for all briefs
- [ ] Correction protocol documented (LEGAL_CHECKLIST.md)

## DATA QUALITY
- [ ] All 12 TinyFish agents tested and returning data or graceful unavailable
- [ ] NSE FII/DII agent returning real numbers (test at 9am IST on a trading day)
- [ ] Gate 1 (prohibited language) tested with deliberate violations
- [ ] Gate 2 (source completeness) tested with missing source_url
- [ ] Gate 3 (disclaimer) tested with wrong disclaimer text
- [ ] Slack alerts firing correctly for gate failures

## PIPELINE
- [ ] Cron scheduled correctly for 7:00am IST (1:30am UTC)
- [ ] Manual trigger endpoint tested: POST /api/trigger
- [ ] Full pipeline test: trigger → ingest → synthesise → gates → publish
- [ ] Fallback HTML output working when Substack API unavailable
- [ ] Database: briefs table populated, audits table populated

## WEB APP
- [ ] 7 backdated briefs in archive and rendering correctly
- [ ] Reading level toggle working in both Simple and Detailed
- [ ] Disclaimer visible in BOTH reading levels (test this explicitly)
- [ ] Source links in Detailed view open correct URLs
- [ ] OG card rendering correctly (test with opengraph.xyz)
- [ ] Mobile responsive (test at 375px width)

## SUBSTACK
- [ ] Substack publication created
- [ ] API key configured and tested
- [ ] One test brief published as draft — review formatting
- [ ] Disclaimer visible in email preview

## DAY 1 PLAN
- [ ] First live brief generated and reviewed manually
- [ ] Published to Substack at 8:00am IST
- [ ] Twitter/X post drafted: headline + key signal + link
- [ ] "What is this?" page published on Substack explaining the product
- [ ] Launch announcement posted in relevant communities
