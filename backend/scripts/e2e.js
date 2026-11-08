#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_INVOICES_DIR = path.join(__dirname, '../../data/test-invoices');
const EXPECTED_RESULTS_PATH = path.join(__dirname, '../../data/expected_results.json');
const POLL_INTERVAL = 2000; // 2s
const MAX_TIMEOUT = 60000; // 60s

// Colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

async function uploadInvoice(filePath) {
  const FormData = (await import('formdata-node')).FormData;
  const { fileFromPath } = await import('formdata-node/file-from-path');

  const formData = new FormData();
  const file = await fileFromPath(filePath);
  formData.append('invoice', file);

  const response = await fetch(`${SERVER_URL}/api/invoices/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function pollInvoice(invoiceId) {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_TIMEOUT) {
    const response = await fetch(`${SERVER_URL}/api/invoices/${invoiceId}`);

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status} ${response.statusText}`);
    }

    const invoice = await response.json();

    if (invoice.status !== 'processing') {
      return invoice;
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  throw new Error('Polling timeout exceeded');
}

function printTable(results) {
  console.log('\n' + colors.bold + 'Results:' + colors.reset);
  console.log('┌──────────────────────────┬───────────────┬───────┐');
  console.log('│ File                     │ Route         │ Flags │');
  console.log('├──────────────────────────┼───────────────┼───────┤');

  results.forEach(result => {
    const file = result.filename.padEnd(24).substring(0, 24);
    const route = result.route.padEnd(13).substring(0, 13);
    const flags = String(result.flagCount).padStart(5);
    console.log(`│ ${file} │ ${route} │ ${flags} │`);
  });

  console.log('└──────────────────────────┴───────────────┴───────┘\n');
}

function compareResults(actualResults, expectedResults) {
  let passed = 0;
  let failed = 0;
  let anomaliesCaught = 0;
  let falseAlarms = 0;

  actualResults.forEach(actual => {
    const expected = expectedResults[actual.filename];

    if (!expected) {
      log.warn(`No expected result for ${actual.filename}`);
      return;
    }

    const routeMatch = actual.route === expected.route;
    const flagsMatch = actual.flagCount >= expected.minFlags;

    if (routeMatch && flagsMatch) {
      passed++;
      log.success(`${actual.filename}: route=${actual.route}, flags=${actual.flagCount}`);

      if (actual.flagCount > 0) {
        anomaliesCaught++;
      }
    } else {
      failed++;
      log.error(`${actual.filename}: expected route=${expected.route} flags>=${expected.minFlags}, got route=${actual.route} flags=${actual.flagCount}`);

      if (actual.flagCount > 0 && expected.minFlags === 0) {
        falseAlarms++;
      }
    }
  });

  console.log('\n' + colors.bold + 'Summary:' + colors.reset);

  const totalExpectedAnomalies = Object.values(expectedResults)
    .filter(e => e.minFlags > 0).length;

  if (totalExpectedAnomalies > 0) {
    console.log(`${anomaliesCaught}/${totalExpectedAnomalies} anomalies caught`);
  }

  if (falseAlarms > 0) {
    console.log(`${falseAlarms} false alarm(s)`);
  }

  console.log(`${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`);

  return failed === 0;
}

async function main() {
  log.info(`Testing against: ${SERVER_URL}`);

  if (!fs.existsSync(TEST_INVOICES_DIR)) {
    log.error(`Test invoices directory not found: ${TEST_INVOICES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TEST_INVOICES_DIR).filter(f => !f.startsWith('.'));

  if (files.length === 0) {
    log.warn('No test invoices found');
    process.exit(0);
  }

  log.info(`Found ${files.length} test invoice(s)`);

  const results = [];

  for (const file of files) {
    const filePath = path.join(TEST_INVOICES_DIR, file);

    try {
      log.info(`Uploading ${file}...`);
      const uploadResult = await uploadInvoice(filePath);

      log.info(`Polling invoice ${uploadResult.invoiceId}...`);
      const invoice = await pollInvoice(uploadResult.invoiceId);

      results.push({
        filename: file,
        route: invoice.route,
        flagCount: invoice.flags ? invoice.flags.length : 0,
        flags: invoice.flags || []
      });

      log.success(`${file} processed: ${invoice.route}`);
    } catch (error) {
      log.error(`${file} failed: ${error.message}`);
      results.push({
        filename: file,
        route: 'error',
        flagCount: 0,
        flags: []
      });
    }
  }

  printTable(results);

  if (fs.existsSync(EXPECTED_RESULTS_PATH)) {
    const expectedResults = JSON.parse(fs.readFileSync(EXPECTED_RESULTS_PATH, 'utf-8'));
    const allPassed = compareResults(results, expectedResults);

    process.exit(allPassed ? 0 : 1);
  } else {
    log.warn('No expected_results.json found, skipping validation');
    process.exit(0);
  }
}

main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
