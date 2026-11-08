# Invoice Anomaly Desk - API Contract

> API documentation for frontend integration

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-vultr-vm/api
```

## Response Format

All endpoints return standardized JSON responses:

**Success:**
```json
{
  "ok": true,
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `FILE_TOO_LARGE` | File exceeds 10MB limit |
| `INVALID_FILE_TYPE` | Only PDF and CSV allowed |
| `UPLOAD_FAILED` | File upload error |
| `EXTRACTION_FAILED` | Failed to extract invoice data |
| `AI_SERVICE_ERROR` | Vultr AI service error |
| `DATABASE_ERROR` | Database operation failed |
| `PIPELINE_ERROR` | Processing pipeline error |
| `INTERNAL_ERROR` | Server error |

## Invoice Status Flow

```
received → processing → [auto_cleared | needs_review | blocked]
                              ↓             ↓
                         (no action)   [approved | rejected | query_sent]
```

**Status Definitions:**
- `received`: Just uploaded
- `processing`: In pipeline
- `auto_cleared`: Passed all checks automatically
- `needs_review`: Has flags, needs human review
- `blocked`: High risk, blocked from payment
- `approved`: Human approved for payment
- `rejected`: Human rejected
- `query_sent`: Query email sent to supplier
- `failed`: Processing failed

## Authentication

Protected endpoints require admin token:

```
X-Admin-Token: your-admin-token
```

Or:

```
Authorization: Bearer your-admin-token
```

## Rate Limiting

- 100 requests per 15 minutes per IP
- 429 status code when exceeded

---

## Endpoints

### Health Check

**GET** `/health`

Check API health and status.

**Response:**
```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-11-07T10:30:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "database": "connected",
    "memory": {
      "used": 150,
      "total": 512,
      "unit": "MB"
    }
  }
}
```

**curl:**
```bash
curl http://localhost:3000/api/health
```

---

### Upload Invoices

**POST** `/invoices/upload`

Upload invoice files for processing.

**Headers:**
- `Content-Type: multipart/form-data`

**Form Data:**
- `files`: Invoice files (up to 10 files)
  - Max size: 10MB per file
  - Formats: PDF, CSV only

**Response:**
```json
{
  "ok": true,
  "data": {
    "message": "Successfully uploaded 2 invoice(s)",
    "invoices": [
      {
        "id": "67890abcdef1234567890abc",
        "originalFileName": "invoice-001.pdf",
        "fileType": "pdf",
        "status": "received",
        "createdAt": "2026-11-07T10:35:00.000Z"
      }
    ]
  }
}
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/invoices/upload \
  -F "files=@invoice-001.pdf" \
  -F "files=@invoice-002.csv"
```

---

### List Invoices

**GET** `/invoices`

List invoices with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status
- `route` (optional): Filter by route (auto_cleared|needs_review|blocked)
- `vendor` (optional): Filter by vendor ID
- `search` (optional): Search in filename, invoice number, vendor name
- `limit` (optional, default 25): Results per page
- `offset` (optional, default 0): Pagination offset

**Response:**
```json
{
  "ok": true,
  "data": {
    "invoices": [
      {
        "_id": "67890abcdef1234567890abc",
        "originalFileName": "invoice-001.pdf",
        "fileType": "pdf",
        "status": "needs_review",
        "route": "needs_review",
        "riskScore": 15,
        "extracted": {
          "vendorName": "Acme Corp",
          "invoiceNumber": "INV-12345",
          "total": 15000,
          "currency": "USD"
        },
        "createdAt": "2026-11-07T10:35:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 25,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**curl:**
```bash
# All invoices
curl "http://localhost:3000/api/invoices"

# Filter by status
curl "http://localhost:3000/api/invoices?status=needs_review"

# Search
curl "http://localhost:3000/api/invoices?search=Acme"

# Pagination
curl "http://localhost:3000/api/invoices?limit=10&offset=20"
```

---

### Get Invoice by ID

**GET** `/invoices/:id`

Get detailed invoice with flags and email draft.

**Response:**
```json
{
  "ok": true,
  "data": {
    "invoice": {
      "_id": "67890abcdef1234567890abc",
      "originalFileName": "invoice-001.pdf",
      "fileType": "pdf",
      "status": "needs_review",
      "route": "needs_review",
      "riskScore": 15,
      "extracted": {
        "vendorName": "Acme Corp",
        "invoiceNumber": "INV-12345",
        "invoiceDate": "2026-11-01T00:00:00.000Z",
        "currency": "USD",
        "lineItems": [
          {
            "description": "Consulting Services",
            "quantity": 1,
            "unitPrice": 15000,
            "amount": 15000
          }
        ],
        "subtotal": 15000,
        "tax": 0,
        "total": 15000,
        "bankAccount": "****1234",
        "poNumber": "PO-789"
      },
      "vendorId": {
        "_id": "67890...",
        "name": "Acme Corp",
        "email": "billing@acme.com"
      },
      "flags": [
        {
          "_id": "67890...",
          "type": "price_outlier",
          "severity": "medium",
          "evidence": {
            "invoiceAmount": 15000,
            "avgHistorical": 5000,
            "threshold": 10000
          },
          "explanation": "This invoice amount ($15,000) is 3x higher than the average for this vendor ($5,000), exceeding our outlier threshold."
        }
      ],
      "emailDraft": {
        "_id": "67890...",
        "subject": "Query Regarding Invoice INV-12345",
        "body": "Dear Acme Corp,\n\nWe are reviewing invoice INV-12345...",
        "status": "draft"
      },
      "createdAt": "2026-11-07T10:35:00.000Z"
    }
  }
}
```

**curl:**
```bash
curl "http://localhost:3000/api/invoices/67890abcdef1234567890abc"
```

---

### Make Decision

**POST** `/invoices/:id/decision`

Make decision on flagged invoice (approve/reject/send query).

**Headers:**
- `Content-Type: application/json`
- `X-Admin-Token: your-admin-token`

**Request Body:**
```json
{
  "decision": "approve",  // approve | reject | send_query
  "note": "Verified with vendor via phone"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "message": "Invoice approved successfully",
    "invoice": {
      "id": "67890abcdef1234567890abc",
      "status": "approved"
    }
  }
}
```

**curl:**
```bash
curl -X POST "http://localhost:3000/api/invoices/67890abcdef1234567890abc/decision" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your-token" \
  -d '{"decision":"approve","note":"Verified with vendor"}'
```

---

### Update Email Draft

**PUT** `/emails/:id`

Edit email draft before sending.

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "subject": "Updated subject line",
  "body": "Updated email body..."
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "email": {
      "_id": "67890...",
      "subject": "Updated subject line",
      "body": "Updated email body...",
      "status": "draft",
      "updatedAt": "2026-11-07T11:00:00.000Z"
    }
  }
}
```

---

### List Vendors

**GET** `/vendors`

List all vendors.

**Query Parameters:**
- `search` (optional): Search by name
- `limit` (optional, default 50)
- `offset` (optional, default 0)

**Response:**
```json
{
  "ok": true,
  "data": {
    "vendors": [
      {
        "_id": "67890...",
        "name": "Acme Corp",
        "taxId": "12-3456789",
        "bankAccount": "****1234",
        "email": "billing@acme.com",
        "paymentTerms": "net30",
        "isActive": true
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### Create Vendor

**POST** `/vendors`

Create new vendor.

**Request Body:**
```json
{
  "name": "New Vendor Inc",
  "taxId": "98-7654321",
  "bankAccount": "1234567890",
  "email": "billing@newvendor.com",
  "paymentTerms": "net30"
}
```

---

### List Purchase Orders

**GET** `/purchase-orders`

List purchase orders.

**Query Parameters:**
- `vendorId` (optional)
- `status` (optional)
- `limit`, `offset`

---

### Create Purchase Order

**POST** `/purchase-orders`

Create new purchase order.

**Request Body:**
```json
{
  "poNumber": "PO-1001",
  "vendorId": "67890...",
  "lineItems": [
    {
      "description": "Service A",
      "quantity": 5,
      "unitPrice": 100,
      "amount": 500
    }
  ],
  "status": "approved",
  "approvedBy": "Manager Name"
}
```

---

### Get Statistics

**GET** `/stats`

Get system statistics.

**Response:**
```json
{
  "ok": true,
  "data": {
    "totalInvoices": 150,
    "autoCleared": 100,
    "needsReview": 40,
    "blocked": 10,
    "approved": 35,
    "rejected": 5,
    "flagsByType": {
      "price_outlier": 25,
      "duplicate_invoice": 5,
      "bank_details_changed": 2
    },
    "moneyAtRisk": 125000,
    "estimatedHoursSaved": 25
  }
}
```

---

### Get Audit Log

**GET** `/audit`

Get audit trail events.

**Query Parameters:**
- `invoiceId` (optional): Filter by invoice
- `limit` (optional, default 100)
- `offset` (optional)

**Response:**
```json
{
  "ok": true,
  "data": {
    "events": [
      {
        "_id": "67890...",
        "invoiceId": "67890...",
        "actor": "user",
        "action": "decision_approve",
        "details": {
          "note": "Verified with vendor"
        },
        "ipAddress": "192.168.1.1",
        "createdAt": "2026-11-07T11:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 500,
      "limit": 100,
      "offset": 0
    }
  }
}
```

---

## Data Models

### Invoice

```typescript
{
  _id: ObjectId,
  originalFileName: string,
  storedFileName: string,
  fileType: 'pdf' | 'csv',
  rawText: string,
  extracted: {
    vendorName?: string,
    invoiceNumber?: string,
    invoiceDate?: Date,
    currency: string,
    lineItems: Array<{
      description: string,
      quantity: number,
      unitPrice: number,
      amount: number
    }>,
    subtotal?: number,
    tax?: number,
    total?: number,
    bankAccount?: string, // Last 4 digits only
    poNumber?: string
  },
  status: 'received' | 'processing' | 'auto_cleared' | 'needs_review' | 
          'blocked' | 'approved' | 'rejected' | 'query_sent' | 'failed',
  riskScore: number, // 0-100
  route: 'auto_cleared' | 'needs_review' | 'blocked',
  vendorId?: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Flag

```typescript
{
  _id: ObjectId,
  invoiceId: ObjectId,
  type: 'duplicate_invoice' | 'bank_details_changed' | 
        'over_purchase_order' | 'no_matching_po' | 
        'price_outlier' | 'math_error' | 'unknown_vendor',
  severity: 'high' | 'medium' | 'low',
  evidence: object, // Specific data points
  explanation?: string, // AI-generated explanation
  createdAt: Date
}
```

### Email

```typescript
{
  _id: ObjectId,
  invoiceId: ObjectId,
  subject: string,
  body: string,
  status: 'draft' | 'approved' | 'in_outbox',
  approvedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Notes

- All dates are ISO 8601 format (UTC)
- ObjectIds are 24-character hexadecimal strings
- File uploads are processed asynchronously - status will update from `received` to `processing` to final state
- Bank account numbers are always masked except last 4 digits
- Invoice text is never returned in list endpoints (only in detail view)
- Rate limiting applies to all endpoints
- Pagination defaults: limit=25 for invoices, limit=50 for vendors/POs, limit=100 for audit

## Security Notes

- Never log full invoice text or bank account numbers
- Always use HTTPS in production
- Admin token must be 32+ characters
- All invoice text is treated as untrusted data
- AI prompts include injection protection
- MongoDB queries are sanitized against NoSQL injection
