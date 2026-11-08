# Invoice Anomaly Desk - Test Suite

## Structure

```
tests/
├── utils/
│   ├── testDb.js      - MongoDB test database utilities
│   ├── mocks.js       - Mock AI clients and file readers
│   └── fixtures.js    - Test data generators
├── unit/              - Unit tests (23 tests)
│   ├── env.test.js           ✓ Environment validation
│   ├── retry.test.js         ✓ Retry logic with backoff
│   ├── chatJsonRepair.test.js ✓ JSON repair in AI responses
│   ├── csvReader.test.js     ✓ CSV parsing
│   ├── pdfReader.test.js     ✓ PDF text extraction
│   ├── statsService.test.js  - Stats calculation (needs MongoDB)
│   └── detection.test.js     - Anomaly detection (needs MongoDB)
└── integration/       - Integration tests (existing)
```

## Running Tests

### All tests
```bash
npm test
```

### Watch mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:coverage
```

### Specific test file
```bash
npx vitest run src/tests/unit/retry.test.js
```

### Non-DB tests only (no MongoDB required)
```bash
npx vitest run src/tests/unit/env.test.js src/tests/unit/retry.test.js src/tests/unit/chatJsonRepair.test.js src/tests/unit/csvReader.test.js src/tests/unit/pdfReader.test.js
```

## Requirements

### For all tests
- Node.js 20+
- Dependencies installed (`npm install`)

### For DB-dependent tests (statsService, detection)
- MongoDB running on `localhost:27017`
- Or set `MONGODB_URI` in `.env.test`

## Environment

Tests use `.env.test` for configuration:
- `MONGODB_URI` - Test database (defaults to `mongodb://localhost:27017/invoice-test`)
- `VULTR_INFERENCE_API_KEY` - Mock key (not called in unit tests)
- Other settings (see `.env.test`)

## Test Utilities

### testDb.js
- `setupTestDb()` - Connect to test database
- `teardownTestDb()` - Drop database and disconnect
- `clearCollections()` - Wipe all collections between tests

### mocks.js
- `mockInferenceClient()` - Mock AI client
- `setExtractionResponse(data)` - Set mock AI response
- `mockPdfReader()` - Mock PDF reader
- `mockCsvReader()` - Mock CSV reader

### fixtures.js
- `createTestVendor(overrides)` - Generate test vendor
- `createTestPO(overrides)` - Generate test purchase order
- `createTestInvoice(overrides)` - Generate test invoice

## Current Status

✅ 23 unit tests passing (non-DB tests)
⏳ 2 unit tests require MongoDB to run (statsService, detection)
✅ Integration tests exist (separate suite)

## Quick Start

```bash
# Install dependencies
npm install

# Run tests without MongoDB
npx vitest run src/tests/unit/env.test.js src/tests/unit/retry.test.js src/tests/unit/chatJsonRepair.test.js src/tests/unit/csvReader.test.js src/tests/unit/pdfReader.test.js

# Start MongoDB (if not running)
# Then run all tests
npm test
```
