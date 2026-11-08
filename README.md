# Invoice Anomaly Desk

> AI-powered invoice review system for the Vultr: Agent Rush Hackathon

**Status:** 🚧 In Development

## Overview

Invoice Anomaly Desk helps small businesses prevent invoice fraud, duplicate payments, and overpayments through automated anomaly detection and AI-powered analysis.

### How It Works

1. **Upload** - Submit supplier invoices (PDF/CSV)
2. **Extract** - AI extracts invoice fields using Vultr Serverless Inference
3. **Detect** - Code-based checks find 7 types of anomalies
4. **Route** - Invoices auto-clear, need review, or get blocked
5. **Explain** - AI explains each flag in plain English
6. **Review** - Human approves, rejects, or queries supplier
7. **Audit** - Every decision logged for compliance

### Core Principle

**CODE makes detection decisions. AI only extracts, explains, and drafts.**

## Tech Stack

### Backend
- **Runtime:** Node.js 20 + Express 4 (ES modules)
- **Database:** MongoDB + Mongoose
- **AI:** Vultr Serverless Inference (OpenAI-compatible)
- **Security:** Helmet, CORS, rate limiting, input validation
- **Testing:** Vitest + Supertest

### Vultr Services
- **Vultr Cloud Compute:** Backend API hosting
- **Vultr Serverless Inference:** All AI model calls

## Quick Start

```bash
# Install dependencies
cd backend
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Vultr API key

# Start MongoDB (local)
# Ensure MongoDB is running on localhost:27017

# Run development server
npm run dev

# Test health endpoint
curl http://localhost:3000/api/health
```

## Project Structure

```
invoice-anomaly-desk/
├── backend/           # Node.js API
├── frontend/          # React app (teammate)
├── data/              # Sample invoices (teammate)
├── docs/              # API contract, architecture
├── deploy/            # Deployment scripts
└── README.md
```

## API Documentation

See [docs/api-contract.md](docs/api-contract.md) for complete API reference.

## Deployment

Deployed on Vultr Cloud Compute VM via Docker.

See [docs/deployment.md](docs/deployment.md) for deployment guide.

## Team

- **Backend & Integration:** Ammar Zia
- **Frontend:** Team member (React)
- **Detection Module:** Team member (Anomaly logic)

## License

MIT License - see [LICENSE](LICENSE)

## Hackathon

Built for **Vultr: Agent Rush Hackathon** (lablab.ai)  
**Challenge 2:** Powering the Future of Work
