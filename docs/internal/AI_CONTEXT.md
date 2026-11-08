# AI_CONTEXT.md - The Constitution

## Project Identity

**Name:** Invoice Anomaly Desk

**Type:** AI-powered SaaS application for invoice fraud detection and prevention

**Scope:** Backend API system with AI-powered anomaly detection, explanation generation, and automated supplier communication

**Core Purpose:** Help small businesses prevent invoice fraud, duplicate payments, and overpayments through automated anomaly detection and AI-assisted decision making

**Core Principle:** CODE detects anomalies → AI explains them → HUMANS decide the outcome

**Target Users:** Small business finance teams, accounts payable departments

## Tech Stack

### Backend (Primary Focus)
- **Runtime:** Node.js 20 LTS with ES modules
  - *Rationale:* Modern async/await, top-tier ecosystem, Vultr compatibility
- **Framework:** Express 4.x
  - *Rationale:* Battle-tested, minimal overhead, extensive middleware ecosystem
- **Database:** MongoDB 7 with Mongoose ODM
  - *Rationale:* Flexible schema for varied invoice formats, excellent audit trail support
- **AI/ML:** Vultr Serverless Inference (OpenAI-compatible API)
  - *Rationale:* Hackathon requirement, cost-effective, Llama 3.1 70B for complex reasoning
- **AI Client:** OpenAI SDK
  - *Rationale:* Industry standard, OpenAI-compatible with Vultr endpoints
- **Validation:** Zod
  - *Rationale:* TypeScript-first schemas work in pure JavaScript, runtime type safety
- **Logging:** Pino
  - *Rationale:* Structured JSON logs, high performance, automatic secret redaction
- **Security:** Helmet, CORS, express-rate-limit, mongo-sanitize
  - *Rationale:* Defense in depth against common web vulnerabilities

### Deployment
- **Containerization:** Docker + Docker Compose (multi-stage builds)
- **Reverse Proxy:** Nginx (rate limiting, TLS termination)
- **Hosting:** Vultr Cloud Compute
- **CI/CD:** Automated deployment scripts (`deploy/deploy.sh`)

### Testing
- **Framework:** Vitest
  - *Rationale:* Fast, modern, ESM-native test runner

## Architecture

### Design Pattern
**Clean Architecture with Service Layer Pattern**

```
┌─────────────────────────────────────────────┐
│ Routes (HTTP entry points)                  │
├─────────────────────────────────────────────┤
│ Controllers (request/response handling)     │
├─────────────────────────────────────────────┤
│ Services (business logic)                   │
│ ├─ AI Service (Vultr LLM integration)       │
│ ├─ Detection Engine (anomaly rules)         │
│ ├─ Pipeline Service (6-step workflow)       │
│ ├─ PDF/CSV Readers (data extraction)        │
│ └─ Audit Service (compliance logging)       │
├─────────────────────────────────────────────┤
│ Models (Mongoose schemas + validation)      │
├─────────────────────────────────────────────┤
│ Database (MongoDB)                          │
└─────────────────────────────────────────────┘
```

### Directory Hierarchy

```
backend/
├── src/
│   ├── config/          # Environment, database, model configuration
│   ├── controllers/     # Express route handlers (invoices, vendors, POs, emails, stats, audit)
│   ├── detection/       # Code-based anomaly detection (7 check types)
│   ├── middleware/      # Auth, upload, error handling, async wrapper
│   ├── models/          # Mongoose schemas (Invoice, Vendor, PO, Email, Audit, Stats)
│   ├── pipeline/        # 6-step processing pipeline (ingest→extract→check→score→explain→draft)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   │   ├── aiService.js        # Vultr LLM integration
│   │   ├── auditService.js     # Compliance logging
│   │   ├── csvReader.js        # CSV invoice parser
│   │   ├── pdfReader.js        # PDF text extraction
│   │   └── statsService.js     # Dashboard metrics
│   ├── tests/           # Vitest unit + integration tests
│   └── utils/           # Logger, response formatter, retry logic
├── scripts/             # Seed data, model listing, e2e tests
├── package.json
├── Dockerfile
└── vitest.config.js

data/                    # Test invoices, vendors, POs, expected results
docs/                    # API docs, architecture, deployment guide, frontend handoff
deploy/                  # Deployment automation (Bash scripts, Nginx config)
```

### File Boundaries

**Controllers:** Handle HTTP only - parse requests, call services, format responses
**Services:** Pure business logic - no req/res objects, return data or throw errors
**Models:** Schema definitions + instance methods only - no business logic
**Detection Engine:** Pure functions - deterministic anomaly detection, no AI calls
**Pipeline Steps:** Modular, single-responsibility - each step independent and testable

## Design Tokens

### Color Palette (Light Mode)
- **Primary:** `#2563eb` (Blue 600) - Action buttons, links
- **Success:** `#16a34a` (Green 600) - Auto-cleared invoices
- **Warning:** `#ea580c` (Orange 600) - Needs review
- **Danger:** `#dc2626` (Red 600) - Blocked invoices
- **Neutral Gray Scale:** `#f9fafb` (50), `#f3f4f6` (100), `#e5e7eb` (200), `#d1d5db` (300), `#6b7280` (500), `#374151` (700), `#1f2937` (900)

### Color Palette (Dark Mode)
- **Primary:** `#3b82f6` (Blue 500)
- **Success:** `#22c55e` (Green 500)
- **Warning:** `#f97316` (Orange 500)
- **Danger:** `#ef4444` (Red 500)
- **Neutral Gray Scale:** `#111827` (900 bg), `#1f2937` (800), `#374151` (700), `#4b5563` (600), `#9ca3af` (400), `#e5e7eb` (200), `#f9fafb` (50)

### Typography
- **Headings:** System font stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)
- **Body:** Same as headings (native system fonts for performance)
- **Monospace:** "JetBrains Mono", "Fira Code", Consolas, monospace (for invoice IDs, amounts)

### Component Spacing
- **Base unit:** 4px
- **Small gap:** 8px (2 units)
- **Medium gap:** 16px (4 units)
- **Large gap:** 24px (6 units)
- **XL gap:** 32px (8 units)

## Strict Rules

### NEVER (Forbidden)

1. **Dependencies:**
   - ❌ NEVER add Lodash (use native array methods)
   - ❌ NEVER add Moment.js (use native Date or date-fns if needed)
   - ❌ NEVER add request/axios (use native fetch)
   - ❌ NEVER add CommonJS packages (ES modules only)

2. **Anti-Patterns:**
   - ❌ NEVER use callbacks (async/await only)
   - ❌ NEVER put business logic in controllers (use services)
   - ❌ NEVER commit secrets or API keys
   - ❌ NEVER log sensitive data unredacted (bank accounts, passwords, tokens)
   - ❌ NEVER skip input validation (Zod schemas required)
   - ❌ NEVER modify detection engine logic without updating tests
   - ❌ NEVER change AI temperature settings without documented justification

3. **Structural Edits:**
   - ❌ NEVER break the 6-step pipeline order (ingest→extract→check→score→explain→draft)
   - ❌ NEVER bypass the audit trail (all actions must log)
   - ❌ NEVER remove error handling middleware
   - ❌ NEVER disable security middleware (helmet, cors, rate-limit)

4. **Hallucination Prevention:**
   - ❌ NEVER invent Mongoose methods that don't exist (verify in docs)
   - ❌ NEVER create fake Vultr API endpoints
   - ❌ NEVER use unverified npm packages (check npmjs.com first)

### ALWAYS (Required Patterns)

1. **Typing & Validation:**
   - ✅ ALWAYS validate request bodies with Zod schemas
   - ✅ ALWAYS use JSDoc comments for function signatures
   - ✅ ALWAYS validate environment variables on startup

2. **Error Handling:**
   - ✅ ALWAYS use AppError for business logic errors
   - ✅ ALWAYS catch and log errors in async functions
   - ✅ ALWAYS return consistent API response format (`{ success, data, error }`)
   - ✅ ALWAYS use retry logic for external API calls (3 attempts, exponential backoff)

3. **Security:**
   - ✅ ALWAYS redact secrets in logs (logger handles automatically)
   - ✅ ALWAYS mask bank account numbers (show last 4 digits only)
   - ✅ ALWAYS sanitize MongoDB queries (mongo-sanitize)
   - ✅ ALWAYS use authentication middleware for protected routes

4. **AI Integration:**
   - ✅ ALWAYS set temperature=0.0 for data extraction (deterministic)
   - ✅ ALWAYS set temperature=0.2 for explanations (consistent but readable)
   - ✅ ALWAYS set temperature=0.3 for email drafts (slightly creative)
   - ✅ ALWAYS include system prompts with role definitions
   - ✅ ALWAYS validate AI responses match expected schema

5. **Testing:**
   - ✅ ALWAYS write tests for new detection rules
   - ✅ ALWAYS mock AI calls in unit tests
   - ✅ ALWAYS verify detection engine outputs match `data/expected_results.json`

## Model & Tool Strategy

### Model Routing
**Primary Model:** Llama 3.1 70B Instruct Turbo (via Vultr Serverless Inference)
- Use for: Data extraction, anomaly explanation, email drafting
- Fallback: OpenAI GPT-4 (if Vultr unavailable)

### Temperature Strategy
| Task | Temperature | Rationale |
|------|-------------|-----------|
| Data Extraction | 0.0 | Deterministic, no creativity needed |
| Anomaly Explanation | 0.2 | Consistent but human-readable |
| Email Drafting | 0.3 | Slightly creative, professional tone |

### Tool Execution Boundaries
- AI calls ONLY in: `extractStep.js`, `explainStep.js`, `draftStep.js`
- NO AI in: Detection engine (pure code logic), controllers, models
- Retry policy: 3 attempts, exponential backoff (1s, 2s, 4s)

## i18n & Localization

**Current Status:** English only (en-US)

**Future Support (if needed):**
- **Planned Languages:** English (en-US), Spanish (es-ES), French (fr-FR)
- **Character Scripts:** Latin (primary)
- **Text Directionality:** LTR (left-to-right)
- **Currency Handling:** Multi-currency support (USD, EUR, GBP) with proper formatting
- **Date Formats:** ISO 8601 in database, locale-aware display in frontend

## Global Authenticity Rule

**ZERO TOLERANCE FOR HALLUCINATION**

1. **All technical claims must be verifiable:**
   - ✅ Verify API methods in official docs before using
   - ✅ Check npm package existence before import
   - ✅ Confirm Mongoose/Express APIs match current versions

2. **All statistics must cite valid sources:**
   - ✅ Invoice fraud statistics → cite source/DOI
   - ✅ Performance benchmarks → cite measurement methodology
   - ✅ Security claims → cite OWASP/CVE references

3. **No hallucinated APIs or dummy fallbacks:**
   - ❌ NEVER invent Vultr API endpoints
   - ❌ NEVER create fake fallback services
   - ❌ NEVER mock production APIs with hardcoded responses

4. **Verification Protocol:**
   - For new dependencies: Check npmjs.com, verify weekly downloads > 10k
   - For API calls: Read official docs, verify endpoint exists
   - For security claims: Cross-reference OWASP, CVE databases

## Session Management

### Full Boot (Session Start)
```
Read AI_CONTEXT.md, PROJECT_ROADMAP.md, and SYSTEM_LEDGER.md.
Confirm you understand the architecture, strict rules, and active phase before we begin working.
```

### Quick Boot (Context Refresh)
```
Read AI_CONTEXT.md and SYSTEM_LEDGER.md, then resume work from where we left off.
```

### Close-Out (Session End)
```
Update PROJECT_ROADMAP.md and SYSTEM_LEDGER.md to reflect all completed tasks, new files created, and updated system metrics before wrapping up.
```

## Planning Governance

**MANDATORY APPROVAL POLICY:**

🚨 **NEVER make direct file edits, write code, or execute mutating commands without presenting a complete, detailed implementation plan and receiving explicit user approval first.**

**Exceptions (Read-only operations allowed without approval):**
- Reading files
- Searching/grepping code
- Listing directories
- Running non-mutating queries (e.g., `git status`, `npm list`)

**Plan Requirements:**
1. **Context:** Why this change is needed
2. **Approach:** Detailed implementation strategy
3. **Files Modified:** List all files to be changed
4. **Verification:** How to test the changes
5. **Risks:** Potential breaking changes or side effects

**Approval Flow:**
1. Present plan in structured format
2. Wait for explicit user approval ("yes", "approved", "go ahead", etc.)
3. Only then proceed with implementation
4. Update SYSTEM_LEDGER.md after completion

---

**Last Updated:** 2026-11-08
**Document Version:** 1.0.0
