import fs from 'fs';
import dotenv from 'dotenv';
import { extractInvoiceData } from '../src/services/ai/extractInvoice.js';

dotenv.config();

async function tryExtract() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: node scripts/tryExtract.js <file.txt>');
    console.error('Example: node scripts/tryExtract.js sample-invoice.txt');
    process.exit(1);
  }

  try {
    // Read text from file
    const text = fs.readFileSync(filePath, 'utf-8');
    console.log(`Reading from: ${filePath}`);
    console.log(`Text length: ${text.length} characters\n`);

    // Extract invoice data
    console.log('Extracting invoice data...\n');
    const result = await extractInvoiceData(text);

    // Print results
    console.log('✓ Extraction successful!\n');
    console.log('Extracted Data:');
    console.log(JSON.stringify(result.extracted, null, 2));

    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠ Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }

  } catch (error) {
    console.error('✗ Extraction failed:');

    if (error.code === 'ENOENT') {
      console.error(`  File not found: ${filePath}`);
    } else if (error.message.includes('validation')) {
      console.error(`  Validation error: ${error.message}`);
    } else {
      console.error(`  ${error.message}`);
    }

    process.exit(1);
  }
}

tryExtract();
