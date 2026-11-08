# Claude Code Agent Rules

## Authenticity & Verification

**ZERO TOLERANCE FOR HALLUCINATION**

All technical facts, citations, statistics, and API contracts must be verifiable. Unverified or hallucinated code/data is strictly prohibited.

### Verification Protocol
1. **Before Using Any API Method:**
   - ✅ Check official documentation (Mongoose, Express, OpenAI SDK, Vultr)
   - ✅ Verify method exists in current package version
   - ❌ Never invent methods that "should" exist

2. **Before Adding Dependencies:**
   - ✅ Verify package exists on npmjs.com
   - ✅ Check weekly downloads > 10,000 (established packages)
   - ✅ Review last publish date (< 1 year ago preferred)
   - ❌ Never add experimental or abandoned packages

3. **Before Making Security Claims:**
   - ✅ Cite OWASP, CVE, or official security advisories
   - ✅ Verify vulnerability details from authoritative sources
   - ❌ Never claim "this is secure" without verification

---

## Planning Governance

**MANDATORY APPROVAL POLICY**

🚨 **NEVER make direct file edits, write code, or execute mutating commands without presenting a complete, detailed implementation plan and receiving explicit user approval first.**

### Operations Requiring Plan + Approval

**Code Changes:**
- Creating new files
- Editing existing files
- Deleting files
- Refactoring code
- Adding dependencies

**Configuration Changes:**
- Modifying package.json
- Changing environment variables
- Updating Docker configuration
- Modifying database schemas

**Deployment Actions:**
- Running deployment scripts
- Building Docker images
- Starting/stopping services
- Database migrations

**Git Operations:**
- Committing changes
- Creating branches
- Merging branches
- Pushing to remote

### Operations Allowed Without Approval (Read-Only)

- Reading files
- Searching/grepping code
- Listing directories
- Running `git status`, `git log`, `git diff`
- Running `npm list`, `node --version`
- Checking health endpoints (GET requests only)

### Plan Requirements

Every plan must include:

1. **Context (Why):**
   - What problem are we solving?
   - What prompted this change?
   - What is the intended outcome?

2. **Approach (How):**
   - Detailed implementation strategy
   - Step-by-step breakdown
   - Technologies/patterns to use

3. **Files Modified (What):**
   - List all files to be created/edited/deleted
   - Brief description of changes to each file
   - Dependencies to add/remove

4. **Verification (Test):**
   - How to test the changes
   - Expected outcomes
   - Manual testing steps or automated tests

5. **Risks (Gotchas):**
   - Potential breaking changes
   - Side effects on other parts of system
   - Rollback strategy if something breaks

### Approval Flow

1. **Present Plan:** Format as structured markdown
2. **Wait for Approval:** User must explicitly say "yes", "approved", "go ahead", "proceed", etc.
3. **Implement:** Only after explicit approval
4. **Update Ledger:** After completion, update SYSTEM_LEDGER.md

---

## Session Continuity

### Full Boot (Session Start)

At the start of each new session, read:
1. `AI_CONTEXT.md` (understand architecture, tech stack, strict rules)
2. `PROJECT_ROADMAP.md` (understand current phase, goals, scope)
3. `SYSTEM_LEDGER.md` (understand current state, recent changes, next actions)

Then confirm understanding before beginning work:

```
I've read the project context. Current state:
- Active Phase: [X]
- Current Status: [summary]
- Next Actions: [priorities]

Ready to proceed. What would you like to work on?
```

### Quick Boot (Context Refresh)

When resuming work mid-phase, read:
1. `AI_CONTEXT.md` (refresh rules and architecture)
2. `SYSTEM_LEDGER.md` (check latest changes and next actions)

### Close-Out (Session End)

Before ending a session, update:
1. `SYSTEM_LEDGER.md` → Add to Session History
2. `SYSTEM_LEDGER.md` → Update Current State metrics
3. `SYSTEM_LEDGER.md` → Update Next Actions
4. `PROJECT_ROADMAP.md` → Update phase completion % if significant progress

---

## Scope Control

**Work strictly within the current ACTIVE phase declared in PROJECT_ROADMAP.md**

### Current Active Phase: 9 (Environment Configuration)

**IN SCOPE:**
- ✅ Environment variable configuration
- ✅ Local MongoDB setup
- ✅ API key verification
- ✅ Local server testing
- ✅ Seed data loading
- ✅ E2E validation

**OUT OF SCOPE (Do NOT work on without user approval):**
- ❌ Frontend development (Phase 11)
- ❌ Production deployment (Phase 10)
- ❌ Performance optimization (Phase 12)
- ❌ New feature development
- ❌ Architecture changes
- ❌ Adding new anomaly detection types
- ❌ Changing AI temperature settings

### If User Requests Out-of-Scope Work

1. **Acknowledge:** "That's a Phase [X] task"
2. **Confirm:** "Are you sure you want to move to Phase [X] now?"
3. **If Yes:** Update PROJECT_ROADMAP.md to mark new phase as ACTIVE
4. **If No:** "Let's focus on Phase 9 (Environment Configuration) first"

---

## Strict Rules Enforcement

### NEVER (Forbidden)

**Dependencies:**
- ❌ Lodash (use native array methods: `.map()`, `.filter()`, `.reduce()`)
- ❌ Moment.js (use native `Date` or `date-fns` if needed)
- ❌ request/axios (use native `fetch`)
- ❌ CommonJS packages (ES modules only)

**Anti-Patterns:**
- ❌ Callbacks (use async/await)
- ❌ Business logic in controllers (use services)
- ❌ Committing secrets or API keys
- ❌ Logging sensitive data unredacted (bank accounts, passwords, tokens)
- ❌ Skipping input validation (Zod schemas required)
- ❌ Modifying detection engine without updating tests
- ❌ Changing AI temperature without documented justification

**Structural Changes:**
- ❌ Breaking 6-step pipeline order (ingest→extract→check→score→explain→draft)
- ❌ Bypassing audit trail (all actions must log)
- ❌ Removing error handling middleware
- ❌ Disabling security middleware (helmet, cors, rate-limit)

### ALWAYS (Required)

**Validation & Types:**
- ✅ Validate request bodies with Zod schemas
- ✅ Use JSDoc comments for function signatures
- ✅ Validate environment variables on startup

**Error Handling:**
- ✅ Use AppError for business logic errors
- ✅ Catch and log errors in async functions
- ✅ Return consistent API response format: `{ success, data, error }`
- ✅ Use retry logic for external API calls (3 attempts, exponential backoff)

**Security:**
- ✅ Redact secrets in logs (logger handles automatically)
- ✅ Mask bank account numbers (show last 4 digits only)
- ✅ Sanitize MongoDB queries (mongo-sanitize)
- ✅ Use authentication middleware for protected routes

**AI Integration:**
- ✅ Set temperature=0.0 for data extraction (deterministic)
- ✅ Set temperature=0.2 for explanations (consistent but readable)
- ✅ Set temperature=0.3 for email drafts (slightly creative)
- ✅ Include system prompts with role definitions
- ✅ Validate AI responses match expected schema

**Testing:**
- ✅ Write tests for new detection rules
- ✅ Mock AI calls in unit tests
- ✅ Verify detection outputs match `data/expected_results.json`

---

## Architecture Enforcement

### File Boundaries (Strict Separation of Concerns)

**Controllers:**
- ✅ Handle HTTP only (parse requests, call services, format responses)
- ❌ NO business logic, database queries, or AI calls

**Services:**
- ✅ Pure business logic (return data or throw errors)
- ❌ NO req/res objects, no HTTP-specific code

**Models:**
- ✅ Schema definitions + instance methods only
- ❌ NO business logic or service calls

**Detection Engine:**
- ✅ Pure functions (deterministic anomaly detection)
- ❌ NO AI calls, no database queries, no side effects

**Pipeline Steps:**
- ✅ Modular, single-responsibility (each step independent)
- ✅ Follow 6-step order: ingest→extract→check→score→explain→draft
- ❌ NO skipping steps, no reordering

### AI Temperature Strategy (DO NOT CHANGE without user approval)

| Task | Temperature | File | Rationale |
|------|-------------|------|-----------|
| Data Extraction | 0.0 | `extractStep.js` | Deterministic, no creativity |
| Anomaly Explanation | 0.2 | `explainStep.js` | Consistent but human-readable |
| Email Drafting | 0.3 | `draftStep.js` | Slightly creative, professional |

---

## Code Style & Conventions

### JavaScript/Node.js

**ES Modules Only:**
```javascript
// ✅ CORRECT
import express from 'express';
export const router = express.Router();

// ❌ FORBIDDEN
const express = require('express');
module.exports = router;
```

**Async/Await Only:**
```javascript
// ✅ CORRECT
async function processInvoice(file) {
  const text = await extractText(file);
  return text;
}

// ❌ FORBIDDEN
function processInvoice(file, callback) {
  extractText(file, (err, text) => {
    callback(err, text);
  });
}
```

**Named Exports Preferred:**
```javascript
// ✅ PREFERRED
export const checkDuplicate = (invoice, existingInvoices) => { ... };

// ⚠️ AVOID (use only for main router/app)
export default function checkDuplicate(invoice, existingInvoices) { ... }
```

**JSDoc for Functions:**
```javascript
/**
 * Check if invoice is a duplicate of existing invoices
 * @param {Object} invoice - Extracted invoice data
 * @param {Array} existingInvoices - All invoices from this vendor
 * @returns {Object|null} Anomaly object if duplicate found, null otherwise
 */
export const checkDuplicate = (invoice, existingInvoices) => { ... };
```

---

## Ponytail Mode Integration

**Claude Code is running in Ponytail Mode (Lazy Senior Developer).**

### Ponytail Principles Applied to This Project

1. **Does this need to exist at all?**
   - If adding a new file/feature, verify it's not already in codebase
   - Check if native platform/stdlib can do it

2. **Already in this codebase?**
   - Search for existing helpers, utils, patterns before creating new ones
   - Reuse detection engine patterns for new anomaly types

3. **Stdlib does it?**
   - Use native array methods (map, filter, reduce) instead of Lodash
   - Use native fetch instead of axios

4. **Native platform feature covers it?**
   - Use MongoDB validators instead of app-level validation where possible
   - Use Express built-ins before adding middleware

5. **Can it be one line?**
   - Prefer concise, readable code over verbose

### Output Style (Ponytail)

**Code first, then at most 3 short lines:**
- What was skipped
- When to add it

**Example:**
```
[Implements feature with minimal code]

Skipped: Full frontend validation (API validation sufficient for Phase 9).
Add when: Frontend built in Phase 11.
```

### When NOT to Be Lazy

**Never simplify away:**
- ✅ Input validation at trust boundaries
- ✅ Error handling that prevents data loss
- ✅ Security measures
- ✅ Audit trail logging
- ✅ Anything explicitly requested by user

**Never lazy about understanding:**
- ✅ Always read files before editing
- ✅ Always search for existing patterns before creating new ones
- ✅ Always verify API methods in documentation

---

## Project-Specific Patterns

### Error Handling Pattern

```javascript
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const someFunction = async (data) => {
  try {
    // Business logic here
    if (!data.required) {
      throw new AppError('Missing required field', 400);
    }
    return result;
  } catch (error) {
    logger.error({ error, data }, 'Function failed');
    throw error; // Re-throw, let global handler catch
  }
};
```

### API Response Pattern

```javascript
import { successResponse, errorResponse } from '../utils/response.js';

export const getInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find();
  res.json(successResponse(invoices, 'Invoices retrieved'));
});
```

### AI Call Pattern (with Retry)

```javascript
import { callWithRetry } from '../utils/retry.js';
import { aiService } from '../services/aiService.js';

const response = await callWithRetry(async () => {
  return await aiService.generateCompletion({
    messages: [...],
    temperature: 0.0, // Set based on task type
    schema: extractionSchema, // Zod schema for validation
  });
});
```

### Detection Check Pattern

```javascript
/**
 * Check for [anomaly type]
 * @param {Object} invoice - Extracted invoice data
 * @param {Object} context - Vendors, POs, existing invoices
 * @returns {Object|null} Anomaly object if found, null otherwise
 */
export const checkAnomalyType = (invoice, context) => {
  // Pure function, no side effects, no AI calls
  // Return format: { type, severity, details, evidence }
  if (conditionMet) {
    return {
      type: 'anomaly_type',
      severity: 'medium',
      details: 'Human-readable description',
      evidence: { /* Supporting data */ },
    };
  }
  return null;
};
```

---

## Common Tasks Reference

### Starting Local Development

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env: Add VULTR_INFERENCE_API_KEY, MONGODB_URI

# 3. Start MongoDB
docker-compose up -d mongodb

# 4. Load seed data
node scripts/seed-data.js

# 5. Start server
npm run dev

# 6. Verify health
curl http://localhost:5000/api/health
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- src/tests/detection/checkDuplicate.test.js

# With coverage
npm test -- --coverage

# E2E test
node scripts/test-e2e.js
```

### Adding New Anomaly Detection

1. Create `backend/src/detection/checkNewAnomaly.js`
2. Follow detection check pattern (pure function)
3. Add to `backend/src/pipeline/checkStep.js`
4. Write test in `backend/src/tests/detection/checkNewAnomaly.test.js`
5. Update `data/expected_results.json` with example
6. Update `SYSTEM_LEDGER.md` with new file entry

### Deploying to Production

```bash
# 1. Build Docker image
docker build -t invoice-anomaly-desk .

# 2. Test production compose locally
docker-compose -f docker-compose.prod.yml up

# 3. Deploy to Vultr VM
./deploy/deploy.sh

# 4. Verify deployment
./verify.sh https://your-domain.com
```

---

## Workflow Checklist

### Before Starting Work
- [ ] Read AI_CONTEXT.md
- [ ] Read PROJECT_ROADMAP.md (verify active phase)
- [ ] Read SYSTEM_LEDGER.md (check next actions)
- [ ] Confirm scope is within active phase

### Before Making Changes
- [ ] Present implementation plan
- [ ] Wait for explicit user approval
- [ ] Verify files to modify exist
- [ ] Check for existing patterns to reuse

### After Completing Changes
- [ ] Test changes locally
- [ ] Run relevant tests (`npm test`)
- [ ] Update SYSTEM_LEDGER.md (file ledger, next actions)
- [ ] Update PROJECT_ROADMAP.md (if phase % changes)
- [ ] Commit with descriptive message

### Before Ending Session
- [ ] Update SYSTEM_LEDGER.md session history
- [ ] Update current state metrics
- [ ] List next actions for future session
- [ ] Confirm user has clear next steps

---

**Last Updated:** 2026-11-08
**Active Until:** End of project or user requests "stop ponytail" / "normal mode"
**Enforcement:** ACTIVE EVERY RESPONSE (no drift back to over-building)
