# Market Story Engine

A legally-defensible market intelligence system that transforms expert signals into actionable briefs.

## 🚀 Deployment

Ready to deploy to production?

**[DEPLOYMENT-QUICKSTART.md](./DEPLOYMENT-QUICKSTART.md)** - Complete deployment guide (start here!)

Additional resources:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment instructions
- [PRE-DEPLOYMENT-CHECKLIST.md](./PRE-DEPLOYMENT-CHECKLIST.md) - Complete before deploying
- [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) - Pre-launch verification

## Features

### Daily Market Briefs
- Expert signal aggregation from TinyFish
- NSE FII/DII data integration
- Claude-powered synthesis
- Dual reading levels (Simple + Detailed)
- Substack email distribution
- Legal compliance gates

### Sector Pulse Dashboard
- Real-time sector scoring (0-100)
- Anomaly detection and alerts
- Live market signals
- Visual sector cards with indicators
- Historical trend analysis
- API endpoints for data access

## Architecture

Every brief passes three automated legal gates before publication:
- **GATE 1**: Prohibited language scan (no buy/sell/predict/will/should)
- **GATE 2**: Source completeness (every expert signal has a source_url)
- **GATE 3**: Disclaimer presence (canonical text, exact match)

## Services

### Ingestion Service
- **Port**: 3001
- **Purpose**: TinyFish API integration, NSE data extraction
- **Start**: `npm run dev --workspace=ingestion`

### Synthesis Service
- **Port**: 3002
- **Purpose**: Claude-powered brief generation with dual-layer JSON output
- **Start**: `npm run dev --workspace=synthesis`

### Publisher Service
- **Port**: 3003
- **Purpose**: Substack distribution, legal gate enforcement
- **Start**: `npm run dev --workspace=publisher`

### Web Service
- **Port**: 3000
- **Purpose**: Archive viewer, Sector Pulse Dashboard, admin interface
- **Routes**:
  - `/` - Homepage
  - `/brief/[date]` - Daily brief archive
  - `/dashboard` - Live Sector Pulse Dashboard
  - `/api/dashboard/scores` - Sector scores API
- **Start**: `npm run dev --workspace=web`

## Quick Start

```bash
# Install dependencies
npm install

# Install service dependencies
cd synthesis && npm install
cd ../publisher && npm install
cd ..

# Copy environment template
cp .env.example .env

# Fill in your API keys in .env

# Start all services
npm run dev
```

## Development

This is a monorepo using npm workspaces. Each service is independently deployable.

## Legal Compliance

See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for pre-release requirements.
