# Frontend Team Handoff - Invoice Anomaly Desk

## Quick Start

You can start building the UI **right now** without the backend running.

### Mock Data Location

All API responses are available as JSON files in [`/docs/mock-responses/`](./mock-responses/):

- `upload-response.json` - POST /api/invoices/upload
- `list-invoices.json` - GET /api/invoices (with 3 sample invoices)
- `invoice-detail.json` - GET /api/invoices/:id (complete with flags & email draft)
- `vendors.json` - GET /api/vendors
- `purchase-orders.json` - GET /api/purchase-orders
- `stats.json` - GET /api/stats (dashboard metrics)
- `error-examples.json` - All error response formats

### API Contract

Full documentation: [`/docs/api-contract.md`](./api-contract.md)

**Base URL (local development):** `http://localhost:3000/api`

### Example Integration

```javascript
// Option 1: Use mock data during development
import mockInvoices from '../docs/mock-responses/list-invoices.json';

// Option 2: Switch to real API when ready
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function fetchInvoices() {
  const response = await fetch(`${API_BASE}/invoices`);
  const { data } = await response.json();
  return data.invoices;
}
```

## Key Endpoints You'll Need

### 1. Upload Invoices
```bash
POST /api/invoices/upload
Content-Type: multipart/form-data

curl -X POST http://localhost:3000/api/invoices/upload \
  -F "files=@invoice.pdf" \
  -F "files=@invoice2.csv"
```

**Response:** See `mock-responses/upload-response.json`

### 2. List Invoices (with filters)
```bash
GET /api/invoices?status=needs_review&limit=25&offset=0

# Available filters:
# - status: received|processing|auto_cleared|needs_review|blocked|approved|rejected|query_sent|failed
# - route: auto_cleared|needs_review|blocked
# - vendor: <vendor_id>
# - search: <keyword> (searches filename, invoice number, vendor name)
# - limit: <number> (default 25, max 50)
# - offset: <number> (default 0)
```

**Response:** See `mock-responses/list-invoices.json`

### 3. Invoice Detail (with flags & email)
```bash
GET /api/invoices/:id
```

**Response:** See `mock-responses/invoice-detail.json`

**Important fields:**
- `invoice.extracted` - All extracted fields from the invoice
- `flags[]` - Anomaly flags with severity (high|medium|low), evidence, and AI explanation
- `emailDraft` - Generated supplier query email (if invoice has flags)

### 4. Download Original File
```bash
GET /api/invoices/:id/file

# Returns the original PDF or CSV file
# Headers: Content-Type and Content-Disposition set correctly
```

### 5. Make Decision (approve/reject/query)
```bash
POST /api/invoices/:id/decision
Content-Type: application/json

{
  "decision": "approve",  // or "reject" or "query"
  "note": "Optional note"
}
```

### 6. Dashboard Stats
```bash
GET /api/stats
```

**Response:** See `mock-responses/stats.json`

## Data Models

### Invoice Status Flow
```
received → processing → [auto_cleared | needs_review | blocked]
                             ↓              ↓
                        (no action)   [approved | rejected | query_sent]
```

### Risk Scoring
- **auto_cleared** (0 points): No flags, safe to pay
- **needs_review** (1-9 points): Has flags, needs human review
- **blocked** (≥10 points): High risk, payment blocked

### Flag Types (7 total)
1. `duplicate_invoice` - Same invoice number seen before
2. `bank_account_changed` - Vendor bank account different from master record
3. `over_po_amount` - Invoice exceeds PO approved amount
4. `no_po_found` - No matching purchase order
5. `price_outlier` - Line item price differs significantly from PO
6. `math_error` - Line items don't sum to total
7. `unknown_vendor` - Vendor not in system

Each flag includes:
- `severity`: high | medium | low
- `evidence`: Structured data showing the issue
- `explanation`: Plain English AI-generated explanation

## Testing the Backend

When you're ready to test against the real backend:

1. **Start the server:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Seed test data:**
   ```bash
   npm run seed
   # Creates 3 vendors and 3 purchase orders
   # Safe to run multiple times (idempotent)
   ```

3. **Upload a test invoice:**
   ```bash
   curl -X POST http://localhost:3000/api/invoices/upload \
     -F "files=@sample-invoice.pdf"
   ```

4. **Check health:**
   ```bash
   curl http://localhost:3000/api/health
   ```

## Environment Variables

The backend needs these in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/invoice-anomaly-desk
VULTR_INFERENCE_API_KEY=your-key-here
MODEL_NAME=meta/llama-3.1-70b-instruct
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
CORS_ORIGIN=http://localhost:5173
```

(You don't need these to use mock data)

## Common Gotchas

1. **File upload requires `multipart/form-data`** - Not JSON
2. **All responses wrapped in `{ ok: true, data: {...} }`** - Always check `.data`
3. **Error responses have `{ ok: false, error: { code, message } }`**
4. **Invoice IDs are MongoDB ObjectIds** - 24 hex characters (e.g., `673d4e2f8a1b2c3d4e5f6789`)
5. **Dates are ISO strings** - Use `new Date(invoice.createdAt)` to parse

## Questions?

- **API Contract:** See [`api-contract.md`](./api-contract.md) for full endpoint documentation
- **Architecture:** See [`architecture.md`](./architecture.md) for system design
- **Deployment:** See [`deployment.md`](./deployment.md) when ready to deploy

Happy building! 🚀
